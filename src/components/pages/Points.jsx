import { useState } from "react";
import { PersonalPointHistory, AdminPointHistory } from "../common/PointHistory";

function Points({
  members,
  history,
  allHistory,
  onAdjust,
  canAwardPoints,
  canSeeAllPointHistory,
  isHeadAdmin,
  onDeleteAllPointData,
  onDeleteMonthlyLeaderboard,
}) {
  const [memberId, setMemberId] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!memberId || !points || !reason.trim()) {
      alert("Fill in all fields.");
      return;
    }
    const numericPoints = Number(points);
    if (!Number.isInteger(numericPoints) || numericPoints === 0) {
      alert("Enter a whole number other than zero.");
      return;
    }
    const success = await onAdjust(memberId, numericPoints, reason.trim());
    if (success) {
      setMemberId("");
      setPoints("");
      setReason("");
    }
  };

  const confirmAction = async (message, action, successMessage) => {
    if (!window.confirm(message)) return;
    const success = await action();
    if (success) alert(successMessage);
  };

  return (
    <div className="space-y-6">
      <section className="nexus-glass-strong rounded-3xl p-6 md:p-7 relative overflow-hidden">
        <div className="nexus-glow-yellow w-72 h-72 -top-24 -right-24" />
        <div className="nexus-glow-purple w-72 h-72 -bottom-24 -left-24" />
        <div className="relative">
          <p className="nexus-eyebrow nexus-text-aurora">Points center</p>
          <h2 className="nexus-title text-3xl md:text-4xl font-black mt-1">Points & <span className="nexus-text-ocean">Activity</span></h2>
          <p className="nexus-muted mt-2 max-w-2xl">Track personal progress, make controlled adjustments, and review the club-wide point audit.</p>
        </div>
      </section>

      <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-5 items-start">
        {canAwardPoints && (
          <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
            <div className="relative flex items-end justify-between gap-4 mb-5">
              <div><p className="nexus-eyebrow nexus-text-aurora">Point adjustment</p><h3 className="nexus-title text-2xl font-black mt-1">Award or Deduct</h3></div>
              <span className="nexus-badge-yellow">Admin</span>
            </div>
            <div className="rounded-2xl nexus-glass-flat border border-yellow-400/10 p-4 mb-4 text-sm text-gray-400">
              Use positive values to award points and negative values to deduct them. Every adjustment should have a clear reason.
            </div>
            <form onSubmit={submit} className="space-y-3">
              <label className="block"><span className="nexus-eyebrow block mb-2">Member</span><select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="nexus-select"><option value="">Select member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.nickname || member.full_name}</option>)}</select></label>
              <label className="block"><span className="nexus-eyebrow block mb-2">Points</span><input type="number" step="1" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="10 or -5" className="nexus-input" /></label>
              <label className="block"><span className="nexus-eyebrow block mb-2">Reason</span><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are these points being adjusted?" rows="4" className="nexus-textarea" /></label>
              <button type="submit" disabled={!memberId || !points || !reason.trim()} className="nexus-morphic-button w-full py-3.5 disabled:opacity-40 disabled:cursor-not-allowed">Save Point Adjustment</button>
            </form>
          </section>
        )}

        <section className={`nexus-glass-strong rounded-3xl p-6 relative overflow-hidden ${canAwardPoints ? "" : "xl:col-span-2"}`}>
          <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-end justify-between gap-4 mb-5"><div><p className="nexus-eyebrow nexus-text-ocean">Personal activity</p><h3 className="nexus-title text-2xl font-black mt-1">My Point History</h3></div><span className="nexus-badge-cyan">{history.length} records</span></div>
          {history.length === 0 ? <div className="nexus-glass-flat rounded-2xl p-6 text-center nexus-muted">No point activity yet.</div> : <PersonalPointHistory history={history} />}
        </section>
      </div>

      {canSeeAllPointHistory && (
        <section className="nexus-glass-strong rounded-3xl p-6 md:p-7 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/[0.04] via-transparent to-purple-500/[0.04] pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div><p className="nexus-eyebrow nexus-text-aurora">Audit trail</p><h3 className="nexus-title text-2xl md:text-3xl font-black mt-1">Point Audit History</h3><p className="nexus-muted text-sm mt-1">Complete transaction history for authorized administrators.</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowAllHistory((current) => !current)} className="nexus-morphic-button-ghost px-4 py-2.5">{showAllHistory ? "Hide History" : "View All History"}</button>
              {isHeadAdmin && <><button type="button" onClick={() => confirmAction("Wipe all points and point history? This cannot be undone.", onDeleteAllPointData, "All points and point history were wiped.")} className="nexus-morphic-button-danger px-4 py-2.5">Wipe All Data</button><button type="button" onClick={() => confirmAction("Wipe previous-month performance records? This cannot be undone.", onDeleteMonthlyLeaderboard, "Previous-month performance records were wiped.")} className="nexus-morphic-button-danger px-4 py-2.5">Wipe Previous Month</button></>}
            </div>
          </div>
          {showAllHistory && <div className="relative mt-6">{allHistory.length === 0 ? <div className="nexus-glass-flat rounded-2xl p-6 text-center nexus-muted">No point history exists.</div> : <AdminPointHistory history={allHistory} rankedMembers={members} />}</div>}
        </section>
      )}
    </div>
  );
}

export default Points;
