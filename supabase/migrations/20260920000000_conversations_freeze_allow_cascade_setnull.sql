-- ============================================================================
-- conversations_freeze_identity: allow the ON DELETE SET NULL cascades that
-- account deletion and group deletion depend on.
--
-- Bug
-- ---
-- H3 (20260919000000_messaging_rls_hardening) froze conversations.created_by,
-- kind, group_id and direct_key against end-user UPDATEs to stop a participant
-- re-pointing a thread's identity (e.g. making themselves the creator). The
-- guard only exempts trusted contexts where auth.uid() IS NULL.
--
-- But two legitimate deletes reach conversations through foreign keys declared
-- ON DELETE SET NULL, and both run with the caller's auth.uid() still set:
--
--   * delete_own_account() deletes the caller's profile; conversations they
--     created have created_by SET NULL -> UPDATE -> trigger -> refused.
--   * deleting a group (client-side groups.delete()) has any linked group
--     conversation's group_id SET NULL -> UPDATE -> trigger -> refused.
--
-- Result: "This conversation field cannot be changed" and the delete rolls
-- back. A member who ever started a DM/group could not delete their account;
-- a group with a chat could not be deleted.
--
-- Fix
-- ---
-- Keep blocking the escalation the freeze exists for -- re-pointing a column to
-- a DIFFERENT non-null value -- but permit the SET NULL transitions:
--   * created_by -> NULL only when old.created_by = auth.uid(), i.e. the caller
--     is nulling their OWN creator rows (exactly the self-deletion cascade;
--     delete_own_account is the only hard-delete path, always self-scoped).
--     A participant nulling someone else's created_by stays blocked.
--   * group_id -> NULL (the group-deletion cascade). Re-pointing to another
--     group stays blocked. group_id can't be keyed on auth.uid(), but nulling
--     only detaches -- it grants nobody access -- so it is safe to allow.
--   * kind stays fully frozen (NOT NULL, never nulled by a cascade).
--   * direct_key stays fully frozen (plain column, never nulled by a cascade),
--     preserving the DM dedupe guarantee from 20260918000000.
-- ============================================================================

create or replace function public.conversations_freeze_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    -- created_by: block re-pointing to another member; allow the caller nulling
    -- their own creator rows (the delete_own_account SET NULL cascade).
    if new.created_by is distinct from old.created_by
       and not (new.created_by is null
                and old.created_by is not distinct from auth.uid()) then
      raise exception 'This conversation field cannot be changed';
    end if;

    -- kind is NOT NULL, so this only ever blocks a genuine direct<->group reflip.
    if new.kind is distinct from old.kind then
      raise exception 'This conversation field cannot be changed';
    end if;

    -- group_id: block re-pointing to a DIFFERENT group; allow the SET NULL
    -- cascade fired by deleting the linked group.
    if new.group_id is distinct from old.group_id
       and new.group_id is not null then
      raise exception 'This conversation field cannot be changed';
    end if;

    -- direct_key exists only once 20260918000000 has run; the presence test
    -- keeps this trigger order-independent. Kept fully frozen.
    if to_jsonb(new) ? 'direct_key'
       and (to_jsonb(new) ->> 'direct_key') is distinct from (to_jsonb(old) ->> 'direct_key') then
      raise exception 'This conversation field cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.conversations_freeze_identity() from authenticated;
