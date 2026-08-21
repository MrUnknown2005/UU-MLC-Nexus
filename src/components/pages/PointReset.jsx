import { useState } from "react";

function PointReset({ members, onResetAll, onResetMember }) {
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const [resettingAll, setResettingAll] = useState(false);

  const [resettingMember, setResettingMember] = useState(false);

  const resetAll = async () => {
    if (
      !window.confirm(
        "Reset all current points? The current Top 2 will be saved.",
      )
    ) {
      return;
    }

    setResettingAll(true);

    await onResetAll();

    setResettingAll(false);
  };

  const resetOne = async () => {
    if (!selectedMemberId) {
      alert("Select a member.");

      return;
    }

    const member = members.find((item) => item.id === selectedMemberId);

    if (
      !member ||
      !window.confirm(
        `Reset ${member.nickname || member.full_name}'s points to 0?`,
      )
    ) {
      return;
    }

    setResettingMember(true);

    await onResetMember(selectedMemberId);

    setSelectedMemberId("");

    setResettingMember(false);
  };

  return (
    <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.08] via-orange-500/[0.06] to-yellow-500/[0.06] pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">⚠️</span>
          <h3 className="text-xl font-black text-red-300">
            Point Reset
          </h3>
          <span className="nexus-badge-red">Danger Zone</span>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          Use with care — these actions cannot be undone.
        </p>

        <div className="nexus-glass-flat rounded-2xl p-5">
          <h4 className="font-bold flex items-center gap-2">
            <span className="text-yellow-300">⚡</span> Reset One Member
          </h4>

          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="nexus-select flex-1"
            >
              <option value="">Select member</option>

              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.nickname || member.full_name} — {member.points}
                </option>
              ))}
            </select>

            <button
              onClick={resetOne}
              disabled={resettingMember}
              className="nexus-morphic-button-danger px-5 py-3"
            >
              {resettingMember ? "Resetting..." : "Reset Member"}
            </button>
          </div>
        </div>

        <div className="mt-4 nexus-glass-flat rounded-2xl p-5">
          <h4 className="font-bold flex items-center gap-2">
            <span className="text-red-300">🔥</span> Monthly Reset
          </h4>

          <p className="text-gray-500 text-sm mt-2">
            Saves the current Top 2 as last month's winners, then zeroes out all member points.
          </p>

          <button
            onClick={resetAll}
            disabled={resettingAll}
            className="nexus-morphic-button-danger mt-4 px-5 py-3"
          >
            {resettingAll ? "Resetting..." : "Reset All Points"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default PointReset;
