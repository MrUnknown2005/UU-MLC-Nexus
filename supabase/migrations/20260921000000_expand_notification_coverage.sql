-- ============================================================================
-- 20260921000000_expand_notification_coverage.sql
-- ----------------------------------------------------------------------------
-- Widen which events create a notification. Delivery already works (per-user
-- realtime channel + bell); this only adds server-side producers, mirroring the
-- existing notify_* trigger pattern (SECURITY DEFINER, insert into
-- public.notifications, EXECUTE revoked from authenticated).
--
-- New coverage:
--   A. Incoming messages  → other participants               (type 'message')
--   B. Role / activation  → the affected member              (types 'role','account')
--   C. Group add / remove → the member added or removed       (type 'group')
--   D. Task assign        → the assignee                      (type 'todo')
--      Task complete      → the task's creator                (type 'todo')
--   E. Reading a conversation also clears its bell 'message' notification.
--
-- related_id is TEXT (see notifications table) — uuids are cast ::text, matching
-- the break-glass notification precedent.
-- ============================================================================

-- ── A. Incoming messages → notify the other participants ────────────────────
-- Low-noise: collapse to a single unread 'message' entry per conversation for
-- each recipient (clear the old unread one, insert the latest). A burst of
-- messages leaves ONE up-to-date bell entry, not one per message.
create or replace function public.notify_new_message()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  conv_kind   text;
  conv_group  uuid;
  conv_title  text;
  sender_name text;
  body_text   text;
begin
  if new.sender_id is null then
    return new;
  end if;

  select c.kind, c.group_id, c.title
    into conv_kind, conv_group, conv_title
  from public.conversations c
  where c.id = new.conversation_id;

  select coalesce(nullif(p.nickname, ''), nullif(p.full_name, ''), 'Someone')
    into sender_name
  from public.profiles p
  where p.id = new.sender_id;
  sender_name := coalesce(sender_name, 'Someone');

  if conv_kind = 'group' then
    body_text := sender_name || ' posted in ' || coalesce(
      (select g.name from public.groups g where g.id = conv_group),
      nullif(conv_title, ''),
      'a group'
    );
  else
    body_text := sender_name || ' sent you a message';
  end if;

  -- Collapse: remove any existing unread message-notification for this
  -- conversation before inserting the fresh one.
  delete from public.notifications n
  where n.type = 'message'
    and n.related_id = new.conversation_id::text
    and n.read_at is null
    and n.user_id <> new.sender_id;

  insert into public.notifications (user_id, type, title, message, target_tab, related_id)
  select
    cp.member_id,
    'message',
    'New message',
    body_text,
    'messages',
    new.conversation_id::text
  from public.conversation_participants cp
  join public.profiles p on p.id = cp.member_id
  where cp.conversation_id = new.conversation_id
    and cp.member_id <> new.sender_id
    and p.is_active = true;

  return new;
end;
$function$;

-- ── B. Role change / (de)activation → notify the affected member ────────────
create or replace function public.notify_profile_changes()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  role_label text;
begin
  if new.role is distinct from old.role then
    select coalesce(nullif(rd.name, ''), new.role)
      into role_label
    from public.role_definitions rd
    where rd.role_key = new.role;
    role_label := coalesce(role_label, new.role);

    insert into public.notifications (user_id, type, title, message, target_tab, related_id)
    values (
      new.id,
      'role',
      'Your role changed',
      'Your role is now ' || role_label || '.',
      'profile',
      null
    );
  end if;

  if new.is_active is distinct from old.is_active then
    insert into public.notifications (user_id, type, title, message, target_tab, related_id)
    values (
      new.id,
      'account',
      case when new.is_active then 'Account reactivated' else 'Account deactivated' end,
      case when new.is_active
           then 'Your account has been reactivated. Welcome back.'
           else 'Your account has been deactivated. Contact an admin if you think this is a mistake.'
      end,
      'profile',
      null
    );
  end if;

  return new;
end;
$function$;

-- ── C. Group membership → notify the member added / removed ─────────────────
create or replace function public.notify_group_member_added()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  group_name text;
begin
  -- No self-notification when someone adds themselves.
  if new.member_id = new.added_by then
    return new;
  end if;

  select coalesce(nullif(g.name, ''), 'a group')
    into group_name
  from public.groups g
  where g.id = new.group_id;
  group_name := coalesce(group_name, 'a group');

  insert into public.notifications (user_id, type, title, message, target_tab, related_id)
  values (
    new.member_id,
    'group',
    'Added to a group',
    'You were added to ' || group_name || '.',
    'groups',
    new.group_id::text
  );

  return new;
end;
$function$;

create or replace function public.notify_group_member_removed()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  group_name text;
begin
  -- Only an individual removal. A whole-group deletion cascades through here
  -- too; skip it so we don't spam every member (mirrors sync_group_member_removal).
  if not exists (select 1 from public.groups g where g.id = old.group_id) then
    return old;
  end if;

  select coalesce(nullif(g.name, ''), 'a group')
    into group_name
  from public.groups g
  where g.id = old.group_id;
  group_name := coalesce(group_name, 'a group');

  insert into public.notifications (user_id, type, title, message, target_tab, related_id)
  values (
    old.member_id,
    'group',
    'Removed from a group',
    'You were removed from ' || group_name || '.',
    'groups',
    old.group_id::text
  );

  return old;
end;
$function$;

-- ── D. To-dos: broadcast excludes the assignee; assign/complete notify ──────
-- Broadcast to everyone about a new task, but skip the assignee (they get the
-- targeted "assigned to you" ping below) and the creator.
create or replace function public.notify_users_new_todo()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  insert into public.notifications (user_id, type, title, message, target_tab, related_id)
  select
    p.id,
    'todo',
    'New To-Do task',
    new.title,
    'todo',
    new.id
  from public.profiles p
  where p.is_active = true
    and p.role <> 'guest'
    and p.id <> coalesce(new.created_by,  '00000000-0000-0000-0000-000000000000'::uuid)
    and p.id <> coalesce(new.assigned_to, '00000000-0000-0000-0000-000000000000'::uuid);

  return new;
end;
$function$;

-- Assignment (create with assignee, or assignee changed) → notify the assignee.
-- Completion (incomplete → complete) → notify the task's creator.
create or replace function public.notify_todo_events()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  completer_id   uuid := coalesce(new.completed_by, auth.uid());
  completer_name text;
begin
  -- Branch on TG_OP so OLD is only referenced for UPDATE (it is unassigned on
  -- INSERT, and SQL OR is not guaranteed to short-circuit).
  if tg_op = 'INSERT' then
    -- New task with an assignee (skip a self-assignment).
    if new.assigned_to is not null
       and new.assigned_to is distinct from auth.uid() then
      insert into public.notifications (user_id, type, title, message, target_tab, related_id)
      values (
        new.assigned_to,
        'todo',
        'Task assigned to you',
        new.title,
        'todo',
        new.id::text
      );
    end if;

  elsif tg_op = 'UPDATE' then
    -- Assignee changed to a new person (skip a self-assignment).
    if new.assigned_to is not null
       and new.assigned_to is distinct from old.assigned_to
       and new.assigned_to is distinct from auth.uid() then
      insert into public.notifications (user_id, type, title, message, target_tab, related_id)
      values (
        new.assigned_to,
        'todo',
        'Task assigned to you',
        new.title,
        'todo',
        new.id::text
      );
    end if;

    -- Completed by someone other than the creator → tell the creator.
    if new.completed = true and old.completed = false
       and new.created_by is not null
       and new.created_by is distinct from completer_id then
      select coalesce(nullif(p.nickname, ''), nullif(p.full_name, ''), 'Someone')
        into completer_name
      from public.profiles p
      where p.id = completer_id;
      completer_name := coalesce(completer_name, 'Someone');

      insert into public.notifications (user_id, type, title, message, target_tab, related_id)
      values (
        new.created_by,
        'todo',
        'Task completed',
        completer_name || ' completed: ' || new.title,
        'todo',
        new.id::text
      );
    end if;
  end if;

  return new;
end;
$function$;

-- ── E. Reading a conversation also clears its bell 'message' notification ────
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  update public.conversation_participants
  set last_read_at = now()
  where conversation_id = p_conversation_id
    and member_id = caller;

  -- Keep the bell in sync with the Messages tab.
  update public.notifications
  set read_at = now()
  where user_id = caller
    and type = 'message'
    and related_id = p_conversation_id::text
    and read_at is null;
end;
$$;

-- ── Triggers ────────────────────────────────────────────────────────────────
drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

drop trigger if exists trg_notify_profile_changes on public.profiles;
create trigger trg_notify_profile_changes
  after update on public.profiles
  for each row
  when (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
  execute function public.notify_profile_changes();

drop trigger if exists trg_notify_group_member_added on public.group_members;
create trigger trg_notify_group_member_added
  after insert on public.group_members
  for each row execute function public.notify_group_member_added();

drop trigger if exists trg_notify_group_member_removed on public.group_members;
create trigger trg_notify_group_member_removed
  after delete on public.group_members
  for each row execute function public.notify_group_member_removed();

drop trigger if exists trg_notify_todo_events on public.todos;
create trigger trg_notify_todo_events
  after insert or update on public.todos
  for each row execute function public.notify_todo_events();

-- ── Least privilege: trigger handlers are definer-only ──────────────────────
revoke execute on function public.notify_new_message()          from authenticated;
revoke execute on function public.notify_profile_changes()      from authenticated;
revoke execute on function public.notify_group_member_added()   from authenticated;
revoke execute on function public.notify_group_member_removed() from authenticated;
revoke execute on function public.notify_todo_events()          from authenticated;
