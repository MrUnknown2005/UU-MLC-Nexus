-- Restrict Groups visibility to group members and administrators.
-- Members may only read groups they belong to and their own membership rows.
-- Administrator and head_admin retain full Groups visibility.

drop policy if exists "Everyone can view groups" on public.groups;
create policy "Members can view their groups" on public.groups
  as permissive for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('administrator', 'head_admin')
    )
    or exists (
      select 1
      from public.group_members gm
      where gm.group_id = groups.id
        and gm.member_id = (select auth.uid())
    )
  );

drop policy if exists "Everyone can view group members" on public.group_members;
create policy "Members can view membership for their groups" on public.group_members
  as permissive for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('administrator', 'head_admin')
    )
    or member_id = (select auth.uid())
  );
