-- Allow a group member to see all membership rows for groups they belong to.
-- Members can therefore see their teammates and the contributions represented
-- in their group standings, while membership in unrelated groups remains hidden.

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
    or exists (
      select 1
      from public.group_members my_membership
      where my_membership.group_id = group_members.group_id
        and my_membership.member_id = (select auth.uid())
    )
  );
