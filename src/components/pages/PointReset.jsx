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
    <section className="bg-red-500/[0.05] border border-red-500/20 rounded-3xl p-6">
      <h3 className="text-xl font-semibold text-red-300">Point Reset</h3>

      <div className="mt-5 bg-white/[0.03] rounded-2xl p-5">
        <h4 className="font-semibold">Reset One Member</h4>

        <div className="flex flex-col md:flex-row gap-3 mt-4">
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            className="flex-1 bg-[#18181b] border border-white/10 rounded-xl px-4 py-3"
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
            className="px-5 py-3 bg-red-500 text-white rounded-xl"
          >
            {resettingMember ? "Resetting..." : "Reset Member"}
          </button>
        </div>
      </div>

      <div className="mt-4 bg-white/[0.03] rounded-2xl p-5">
        <h4 className="font-semibold">Monthly Reset</h4>

        <button
          onClick={resetAll}
          disabled={resettingAll}
          className="mt-4 px-5 py-3 bg-red-500 text-white rounded-xl"
        >
          {resettingAll ? "Resetting..." : "Reset All Points"}
        </button>
      </div>
    </section>
  );
}

export default PointReset;
