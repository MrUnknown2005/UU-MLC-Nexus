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

    const success = await onAdjust(memberId, numericPoints, reason);

    if (success) {
      setMemberId("");
      setPoints("");
      setReason("");
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-6">
        {canAwardPoints && (
          <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
            <div className="nexus-glow-yellow w-72 h-72 -top-20 -right-20" />
            <div className="nexus-glow-purple w-72 h-72 -bottom-20 -left-20" />

            <div className="relative">
              <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
                Adjust Points
              </p>

              <h2 className="text-2xl font-black mt-1">
                Award or Deduct
              </h2>

              <p className="text-gray-500 text-sm mt-2 mb-6">
                Positive numbers award. Negative numbers deduct.
              </p>

              <form onSubmit={submit} className="space-y-4">
                <select
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="nexus-select"
                >
                  <option value="">Select member</option>

                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.nickname || member.full_name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="Example: 10 or -5"
                  className="nexus-input"
                />

                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason"
                  rows="4"
                  className="nexus-textarea"
                />

                <button
                  type="submit"
                  className="nexus-morphic-button w-full py-3.5"
                >
                  Save Point Adjustment
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Personal history */}
        <section className={`nexus-glass-strong rounded-3xl p-6 relative overflow-hidden ${
          canAwardPoints ? "" : "lg:col-span-2"
        }`}>
          <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <p className="nexus-text-ocean text-xs font-bold uppercase tracking-wider">
              Your activity
            </p>

            <h2 className="text-2xl font-black mt-1 mb-5">
              My Point History
            </h2>

            <PersonalPointHistory history={history} />
          </div>
        </section>
      </div>

      {/* Admin history */}
      {canSeeAllPointHistory && (
        <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden border-yellow-400/20">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/[0.04] via-transparent to-purple-500/[0.04] pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
                Audit
              </p>

              <h2 className="text-2xl font-black mt-1">
                Point Audit History
              </h2>

              <p className="text-gray-500 text-sm">
                Complete point transaction history.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowAllHistory((current) => !current)}
                className="nexus-morphic-button-ghost px-5 py-3"
              >
                {showAllHistory ? "Hide All History" : "View All History"}
              </button>

              {isHeadAdmin && (
                <>
                  <button
                    onClick={async () => {
                      const success = await onDeleteAllPointData();

                      if (success) {
                        alert("All points and point history were wiped.");
                      }
                    }}
                    className="nexus-morphic-button-danger px-5 py-3"
                  >
                    Wipe All Point Data
                  </button>

                  <button
                    onClick={async () => {
                      const success = await onDeleteMonthlyLeaderboard();

                      if (success) {
                        alert("Previous-month performance records were wiped.");
                      }
                    }}
                    className="nexus-morphic-button-danger px-5 py-3"
                  >
                    Wipe Previous Month
                  </button>
                </>
              )}
            </div>
          </div>

          {showAllHistory && (
            <div className="relative mt-6">
              {allHistory.length === 0 ? (
                <p className="text-gray-500">No point history exists.</p>
              ) : (
                <AdminPointHistory
                  history={allHistory}
                  rankedMembers={members}
                />
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default Points;
