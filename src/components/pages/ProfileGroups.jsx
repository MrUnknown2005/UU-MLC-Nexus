import { useEffect, useState } from "react";
import { StatCard } from "../ui/StatCard.jsx";
import { supabase } from "../../lib/supabaseClient";

/**
 * Shows the signed-in member's assigned groups as a compact dashboard stat.
 *
 * RLS remains the source of truth: members only receive groups they belong to,
 * while administrators can still resolve their complete membership set.
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
        .select("id, name")
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

  const groupNames = groups.map((group) => group.name).join(" · ");

  return (
    <StatCard
      className="nx-rise [animation-delay:120ms]"
      label="Your groups"
      value={
        loading ? (
          ""
        ) : (
          <span className="nx-rise">{groupNames || "None assigned"}</span>
        )
      }
      icon="grid"
      tone="info"
      hint={
        loading
          ? "Loading assignments"
          : groups.length === 0
            ? "No group assignment yet"
            : groups.length === 1
              ? "1 assigned group"
              : `${groups.length} assigned groups`
      }
      loading={loading}
    />
  );
}
