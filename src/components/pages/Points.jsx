import { useMemo, useState } from "react";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Panel } from "../ui/Panel.jsx";
import { Select } from "../ui/Select.jsx";
import { TextArea } from "../ui/TextArea.jsx";
import { TextInput } from "../ui/TextInput.jsx";
import { useConfirm } from "../ui/confirm-context.js";
import { useToast } from "../ui/toast-context.js";
import {
  AdminPointHistory,
  PersonalPointHistory,
} from "../common/PointHistory";
import {
  countLabel,
  displayName,
  formatDelta,
  formatNumber,
} from "../../lib/format.js";
import { cn } from "../../lib/cn.js";

/**
 * Points: award, review, audit.
 *
 * The award form used to validate with three `alert()` calls and reported
 * success by clearing itself. Now every field says what is wrong beside itself,
 * and the form shows the member's resulting total before you commit — an award
 * is a number someone else has to live with, so it should never be a surprise.
 *
 * The two head-admin wipes previously sat behind `window.confirm`, which is one
 * mistyped keystroke away from destroying the club's whole point history. They
 * now require the phrase to be typed out.
 */
const QUICK_AMOUNTS = [5, 10, 25, 50, -5, -10];

const MAX_REASON = 240;

function Points({
  members = [],
  history = [],
  allHistory = [],
  onAdjust,
  canAwardPoints,
  canSeeAllPointHistory,
  isHeadAdmin,
  onDeleteAllPointData,
  onDeleteMonthlyLeaderboard,
}) {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [memberId, setMemberId] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [busy, setBusy] = useState("");

  const selected = useMemo(
    () => members.find((member) => member.id === memberId) ?? null,
    [members, memberId]
  );

  const numeric = Number(points);
  const numericValid =
    points.trim() !== "" && Number.isInteger(numeric) && numeric !== 0;

  const errors = {
    memberId: !memberId ? "Choose who this affects." : "",
    points: !points.trim()
      ? "Enter an amount."
      : !Number.isInteger(numeric)
        ? "Whole numbers only."
        : numeric === 0
          ? "Zero would not change anything."
          : "",
    reason: !reason.trim() ? "Say why — this is recorded permanently." : "",
  };

  const valid = !errors.memberId && !errors.points && !errors.reason;

  const projected = selected
    ? Number(selected.points ?? 0) + (numericValid ? numeric : 0)
    : null;

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);

    if (!valid) return;

    setSubmitting(true);
    const success = await onAdjust(memberId, numeric, reason.trim());
    setSubmitting(false);

    // A failure has already been reported with the server's own reason by the
    // action layer, so there is nothing to add here — keep the form filled in
    // so the adjustment can be retried without retyping it.
    if (!success) return;

    toast.success(
      `${formatDelta(numeric)} for ${displayName(selected)}`,
      { description: reason.trim() }
    );

    setMemberId("");
    setPoints("");
    setReason("");
    setTouched(false);
  };

  const runWipe = async (key, { doneMessage, ...options }, action) => {
    if (!(await confirm(options))) return;

    setBusy(key);
    const success = await action();
    setBusy("");

    if (success) toast.success(doneMessage);
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
    <div className="space-y-5">
      <div
        className={cn(
          "grid items-start gap-5",
          canAwardPoints && "xl:grid-cols-[0.85fr_1.15fr]"
        )}
      >
        {canAwardPoints && (
          <Panel
            icon="sparkles"
            eyebrow="Adjustment"
            title="Award or deduct"
            description="Positive to award, negative to deduct."
            actions={<Badge tone="brand">Recorded</Badge>}
          >
            <form onSubmit={submit} noValidate className="space-y-4">
              <Select
                label="Member"
                required
                placeholder="Select a member"
                value={memberId}
                options={memberOptions}
                error={touched ? errors.memberId : ""}
                onChange={(event) => setMemberId(event.target.value)}
              />

              <div>
                <TextInput
                  label="Points"
                  required
                  type="number"
                  step="1"
                  inputMode="numeric"
                  placeholder="10, or -5 to deduct"
                  value={points}
                  error={touched ? errors.points : ""}
                  onChange={(event) => setPoints(event.target.value)}
                />

                {/* Six taps instead of a keyboard for the amounts that come up
                    over and over at an event. */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className="nx-chip"
                      data-active={numeric === amount && points.trim() !== ""}
                      onClick={() => setPoints(String(amount))}
                    >
                      {formatDelta(amount)}
                    </button>
                  ))}
                </div>
              </div>

              <TextArea
                label="Reason"
                required
                rows={3}
                maxLength={MAX_REASON}
                value={reason}
                error={touched ? errors.reason : ""}
                placeholder="Ran the Friday workshop, placed 2nd in the datathon…"
                hint="Members see this in their history."
                onChange={(event) => setReason(event.target.value)}
              />

              {/* The consequence, spelled out before the button is pressed. */}
              {selected && numericValid && (
                <div className="nx-well flex items-center gap-3 p-3.5">
                  <Icon
                    name={numeric > 0 ? "trending-up" : "arrow-down"}
                    size={17}
                    className={numeric > 0 ? "text-success" : "text-danger"}
                  />
                  <p className="text-[0.8125rem] text-ink-muted">
                    <span className="font-semibold text-ink">
                      {displayName(selected)}
                    </span>{" "}
                    goes from{" "}
                    <span className="nx-num tabular-nums">
                      {formatNumber(selected.points ?? 0)}
                    </span>{" "}
                    to{" "}
                    <span className="nx-num font-semibold text-ink tabular-nums">
                      {formatNumber(projected)}
                    </span>
                  </p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                icon="check"
                loading={submitting}
                disabled={touched && !valid}
              >
                Save adjustment
              </Button>
            </form>
          </Panel>
        )}

        <Panel
          pad="md"
          icon="history"
          eyebrow="Your activity"
          title="Point history"
          description={
            history.length > 0 ? countLabel(history.length, "record") : undefined
          }
        >
          <PersonalPointHistory history={history} />
        </Panel>
      </div>

      {canSeeAllPointHistory && (
        <Panel
          pad="md"
          icon="shield-check"
          eyebrow="Audit trail"
          title="Club-wide point history"
          description="Every adjustment, who it affected and why."
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={showAllHistory ? "chevron-up" : "chevron-down"}
              onClick={() => setShowAllHistory((open) => !open)}
              aria-expanded={showAllHistory}
            >
              {showAllHistory ? "Hide" : `Show ${formatNumber(allHistory.length)}`}
            </Button>
          }
        >
          {showAllHistory ? (
            <AdminPointHistory history={allHistory} rankedMembers={members} />
          ) : (
            <p className="text-[0.8125rem] text-ink-muted">
              {allHistory.length === 0
                ? "No adjustments have been recorded yet."
                : `${countLabel(allHistory.length, "adjustment")} on record. Kept collapsed so the page opens on what you came for.`}
            </p>
          )}
        </Panel>
      )}

      {/* ---------- Destructive, head-admin only ---------- */}
      {canSeeAllPointHistory && isHeadAdmin && (
        <Panel
          icon="alert-triangle"
          eyebrow="Head admin only"
          title="Permanent deletion"
          description="These remove history rather than reset it. There is no undo and no backup."
          className="border-danger-line"
          bodyClassName="grid gap-3 md:grid-cols-2"
        >
          <div className="nx-well flex flex-col gap-3 p-4">
            <div>
              <h4 className="text-[0.875rem] font-semibold">
                Wipe all point data
              </h4>
              <p className="mt-1 text-[0.8125rem] text-ink-muted">
                Sets every member to zero and deletes the entire adjustment
                ledger, for everyone, for all time.
              </p>
            </div>

            <Button
              variant="danger"
              size="sm"
              icon="trash"
              className="self-start"
              loading={busy === "all"}
              onClick={() =>
                runWipe(
                  "all",
                  {
                    title: "Wipe all points and point history?",
                    tone: "danger",
                    confirmLabel: "Wipe everything",
                    requireText: "WIPE ALL POINTS",
                    doneMessage: "All point data was deleted",
                    description:
                      "This is the club's entire record of who earned what. It cannot be recovered.",
                    consequences: [
                      "Every member's point total becomes 0",
                      "Every award and deduction ever recorded is deleted",
                      "Members lose their personal point history",
                    ],
                  },
                  onDeleteAllPointData
                )
              }
            >
              Wipe all point data
            </Button>
          </div>

          <div className="nx-well flex flex-col gap-3 p-4">
            <div>
              <h4 className="text-[0.875rem] font-semibold">
                Wipe archived months
              </h4>
              <p className="mt-1 text-[0.8125rem] text-ink-muted">
                Deletes the saved monthly standouts. Current points are not
                touched.
              </p>
            </div>

            <Button
              variant="danger"
              size="sm"
              icon="trash"
              className="self-start"
              loading={busy === "monthly"}
              onClick={() =>
                runWipe(
                  "monthly",
                  {
                    title: "Delete archived monthly winners?",
                    tone: "danger",
                    confirmLabel: "Delete archive",
                    requireText: "DELETE ARCHIVE",
                    doneMessage: "Archived monthly records were deleted",
                    description:
                      "The monthly standouts shown on the overview come from this archive.",
                    consequences: [
                      "Every archived month's top two is deleted",
                      "Current point totals are unaffected",
                    ],
                  },
                  onDeleteMonthlyLeaderboard
                )
              }
            >
              Wipe archived months
            </Button>
          </div>
        </Panel>
      )}

      {!canAwardPoints && history.length === 0 && (
        <EmptyState
          icon="trophy"
          title="Nothing here yet"
          description="Points are awarded by executives for taking part in club activities. Yours will show up on this page."
        />
      )}
    </div>
  );
}

export default Points;
