export function PersonalPointHistory({ history }) {
  return (
    <div className="space-y-3">
      {history.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between nexus-glass-flat rounded-2xl p-4 hover:border-yellow-400/30 hover:bg-white/[0.06] transition"
        >
          <div>
            <p
              className={
                item.points >= 0
                  ? "nexus-text-aurora font-black"
                  : "text-red-400 font-black"
              }
            >
              {item.points >= 0 ? `+${item.points}` : item.points} points
            </p>

            <p className="text-gray-400 text-sm mt-1">{item.reason}</p>
          </div>

          <span className="text-gray-500 text-xs whitespace-nowrap">
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AdminPointHistory({ history, rankedMembers }) {
  const memberMap = Object.fromEntries(
    rankedMembers.map((member) => [
      member.id,
      member.nickname || member.full_name || "Unknown",
    ]),
  );

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <div
          key={item.id}
          className="nexus-glass-flat rounded-2xl p-5 hover:border-yellow-400/30 transition"
        >
          <p className="font-semibold">{memberMap[item.member_id]}</p>

          <p
            className={
              item.points >= 0
                ? "nexus-text-aurora font-black mt-1"
                : "text-red-400 font-black mt-1"
            }
          >
            {item.points >= 0 ? `+${item.points}` : item.points} points
          </p>

          <p className="text-gray-300 text-sm mt-2">{item.reason}</p>

          <p className="text-gray-600 text-xs mt-2">
            {new Date(item.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
