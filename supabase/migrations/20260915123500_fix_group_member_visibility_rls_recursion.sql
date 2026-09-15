-- Make same-group member visibility safe under Row Level Security.
-- The helper runs as the function owner so the group_members lookup does not
-- recursively invoke the SELECT policy on group_members.

create or replace function public.is_current_user_group_member(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.member_id = auth.uid()
  );
$$;

revoke all on function public.is_current_user_group_member(uuid) from public;
grant execute on function public.is_current_user_group_member(uuid) to authenticated;

drop policy if exists "Members can view membership for their groups" on public.group_members;
create policy "Members can view membership for their groups" on public.group_members
  as permissive for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('administrator', 'head_admin')
    )
    or public.is_current_user_group_member(group_members.group_id)
  );
