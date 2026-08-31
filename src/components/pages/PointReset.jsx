import { useMemo, useState } from "react";
import { Button } from "../ui/Button.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Panel } from "../ui/Panel.jsx";
import { Select } from "../ui/Select.jsx";
import { useConfirm } from "../ui/confirm-context.js";
import { useToast } from "../ui/toast-context.js";
import { displayName, formatNumber, ordinal } from "../../lib/format.js";

/**
 * Point resets.
 *
 * Separate from deletion on purpose: a reset zeroes the running totals and
 * *keeps* the ledger, which is what a club wants at the end of a month. The old
 * screen described the monthly reset in one line of small grey text and put it
 * behind a `window.confirm`; the two winners it is about to archive were not
 * shown anywhere. Both actions now name exactly who and what they affect.
 */
function PointReset({ members = [], onResetAll, onResetMember }) {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [memberId, setMemberId] = useState("");
  const [busy, setBusy] = useState("");

  const selected = useMemo(
    () => members.find((member) => member.id === memberId) ?? null,
    [members, memberId]
  );

  // Whoever is about to be archived as the month's top two, in the order the
  // reset will save them.
  const podium = useMemo(
    () =>
      [...members]
        .filter((member) => member.role !== "guest" && member.is_active !== false)
        .sort((a, b) => Number(b.points ?? 0) - Number(a.points ?? 0))
        .slice(0, 2),
    [members]
  );

  const scored = members.filter((member) => Number(member.points ?? 0) !== 0);

  const resetOne = async () => {
    if (!selected) {
      toast.warn("Choose a member first");
      return;
    }

    const name = displayName(selected);
    const current = Number(selected.points ?? 0);

    const ok = await confirm({
      title: `Reset ${name} to zero?`,
      tone: "danger",
      confirmLabel: "Reset to zero",
      description: `${name} currently has ${formatNumber(current)} ${
        current === 1 ? "point" : "points"
      }. Their history stays on record, so the awards are still visible — only the total changes.`,
      consequences: [
        `${name}'s total becomes 0`,
        "Their position on the leaderboard drops to last",
        "No other member is affected",
      ],
    });

    if (!ok) return;

    setBusy("member");
    const success = await onResetMember(memberId);
    setBusy("");

    // Only claim it happened if it did — a failure has already been reported
    // with the server's reason by the action layer.
    if (!success) return;

    setMemberId("");
    toast.success(`${name} was reset to zero`);
  };

  const resetAll = async () => {
    const ok = await confirm({
      title: "Close the month and reset every total?",
      tone: "danger",
      confirmLabel: "Archive and reset",
      requireText: "RESET ALL POINTS",
      description:
        "The current top two are saved as this month's standouts, then every member's total is set to zero.",
      consequences: [
        podium[0]
          ? `${displayName(podium[0])} is archived as 1st with ${formatNumber(podium[0].points ?? 0)}`
          : "No first place to archive — nobody has points",
        podium[1]
          ? `${displayName(podium[1])} is archived as 2nd with ${formatNumber(podium[1].points ?? 0)}`
          : "No second place to archive",
        `${formatNumber(scored.length)} member${scored.length === 1 ? "" : "s"} with points are reset to 0`,
        "The point history ledger is kept",
      ],
    });

    if (!ok) return;

    setBusy("all");
    const success = await onResetAll();
    setBusy("");

    if (!success) return;

    toast.success("The month was closed and totals reset", {
      description: podium[0]
        ? `${displayName(podium[0])} was archived as this month's top performer.`
        : undefined,
    });
  };

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.id,
        label: `${displayName(member)} — ${formatNumber(member.points ?? 0)}`,
      })),
    [members]
  );

  return (
    <Panel
      icon="refresh"
      eyebrow="Leaderboard cycle"
      title="Reset points"
      description="Totals go back to zero; the history of how they were earned is kept."
      className="border-warn-line"
      bodyClassName="grid gap-3 lg:grid-cols-2"
    >
      {/* ---------- One member ---------- */}
      <div className="nx-well flex flex-col gap-3 p-4">
        <div>
          <h4 className="flex items-center gap-2 text-[0.875rem] font-semibold">
            <Icon name="user" size={15} className="text-ink-muted" />
            One member
          </h4>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">
            For a correction — a duplicate award, or points recorded against the
            wrong person.
          </p>
        </div>

        <Select
          label="Member"
          placeholder="Select a member"
          value={memberId}
          options={memberOptions}
          onChange={(event) => setMemberId(event.target.value)}
        />

        <Button
          variant="danger"
          size="sm"
          icon="refresh"
          className="self-start"
          disabled={!memberId}
          loading={busy === "member"}
          onClick={resetOne}
        >
          Reset this member
        </Button>
      </div>

      {/* ---------- Whole club ---------- */}
      <div className="nx-well flex flex-col gap-3 p-4">
        <div>
          <h4 className="flex items-center gap-2 text-[0.875rem] font-semibold">
            <Icon name="calendar" size={15} className="text-ink-muted" />
            Close the month
          </h4>
          <p className="mt-1 text-[0.8125rem] text-ink-muted">
            Archives the current top two as monthly standouts, then zeroes every
            total to start the next cycle.
          </p>
        </div>

        {/* Showing the podium before the reset is the whole point: this action
            decides who goes into the club's permanent record. */}
        {podium.length > 0 ? (
          <ul className="space-y-1.5">
            {podium.map((member, index) => (
              <li
                key={member.id}
                className="flex items-center gap-2 text-[0.8125rem]"
              >
                <Icon
                  name={index === 0 ? "trophy" : "medal"}
                  size={14}
                  className={index === 0 ? "text-brand-text" : "text-violet"}
                />
                <span className="truncate font-medium">
                  {displayName(member)}
                </span>
                <span className="nx-num text-ink-muted tabular-nums">
                  {formatNumber(member.points ?? 0)}
                </span>
                <span className="text-ink-subtle">
                  · {ordinal(index + 1)} place
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.8125rem] text-ink-subtle italic">
            Nobody has points yet, so there is nothing to archive.
          </p>
        )}

        <Button
          variant="danger"
          size="sm"
          icon="trophy"
          className="self-start"
          loading={busy === "all"}
          onClick={resetAll}
        >
          Archive and reset all
        </Button>
      </div>
    </Panel>
  );
}

export default PointReset;
