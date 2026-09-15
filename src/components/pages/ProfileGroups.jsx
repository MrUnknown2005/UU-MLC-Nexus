import { useEffect, useState } from "react";
import { Badge } from "../ui/Badge.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Panel } from "../ui/Panel.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { supabase } from "../../lib/supabaseClient";

/**
 * Shows the groups the signed-in member belongs to.
 *
 * The query intentionally relies on the database RLS policy: members can only
 * read their own membership rows / groups, while administrators can read all
 * groups. This keeps the UI and the database aligned.
 */
export default function ProfileGroups({ profileId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const { data: memberships, error: membershipError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("member_id", profileId);

      if (membershipError) {
        console.error("Profile groups membership error:", membershipError);
        if (!cancelled) {
          setGroups([]);
          setLoading(false);
        }
        return;
      }

      const groupIds = [...new Set((memberships || []).map((row) => row.group_id))];
      if (groupIds.length === 0) {
        if (!cancelled) {
          setGroups([]);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("groups")
        .select("id, name, description, color")
        .in("id", groupIds)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Profile groups error:", error);
        setGroups([]);
      } else {
        setGroups(data || []);
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (loading) {
    return (
      <Panel eyebrow="Groups" title="Your groups" icon="grid">
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      eyebrow="Groups"
      title="Your groups"
      icon="grid"
      description={
        groups.length
          ? `You are assigned to ${groups.length} group${groups.length === 1 ? "" : "s"}.`
          : "You are not assigned to any group yet."
      }
    >
      {groups.length === 0 ? (
        <EmptyState
          compact
          icon="grid"
          title="No groups assigned"
          description="An administrator can add you to a group from the Groups page."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((group) => (
            <div key={group.id} className="nx-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{group.name}</p>
                  {group.description?.trim() && (
                    <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-muted">
                      {group.description}
                    </p>
                  )}
                </div>
                <Badge tone="brand" size="sm">
                  Member
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
