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
          <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
            <h2 className="text-2xl font-bold">Adjust Points</h2>

            <p className="text-gray-500 text-sm mt-2 mb-6">
              Positive numbers award. Negative numbers deduct.
            </p>

            <form onSubmit={submit} className="space-y-4">
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3"
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
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
              />

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason"
                rows="4"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
              />

              <button
                type="submit"
                className="w-full bg-yellow-400 text-black font-semibold py-3 rounded-xl"
              >
                Save Point Adjustment
              </button>
            </form>
          </section>
        )}

        {/* Personal history */}
        <section className={`bg-white/[0.04] border border-white/10 rounded-3xl p-6 ${
          canAwardPoints ? "" : "lg:col-span-2"
        }`}>
          <h2 className="text-2xl font-bold mb-5">My Point History</h2>

          <PersonalPointHistory history={history} />
        </section>
      </div>

      {/* Admin history */}
      {canSeeAllPointHistory && (
        <section className="bg-white/[0.04] border border-yellow-400/20 rounded-3xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Point Audit History</h2>

              <p className="text-gray-500 text-sm">
                Complete point transaction history.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowAllHistory((current) => !current)}
                className="px-5 py-3 bg-yellow-400 text-black rounded-xl font-semibold"
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
                    className="px-5 py-3 bg-red-600 text-white rounded-xl font-semibold"
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
                    className="px-5 py-3 bg-red-700 text-white rounded-xl font-semibold"
                  >
                    Wipe Previous Month
                  </button>
                </>
              )}
            </div>
          </div>

          {showAllHistory && (
            <div className="mt-6">
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
