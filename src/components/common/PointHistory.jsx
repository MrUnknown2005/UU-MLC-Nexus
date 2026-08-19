export function PersonalPointHistory({ history }) {
  return (
    <div className="space-y-3">
      {history.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between bg-white/[0.03] rounded-2xl p-4"
        >
          <div>
            <p
              className={
                item.points >= 0
                  ? "text-yellow-400 font-semibold"
                  : "text-red-400 font-semibold"
              }
            >
              {item.points >= 0 ? `+${item.points}` : item.points} points
            </p>

            <p className="text-gray-400 text-sm mt-1">{item.reason}</p>
          </div>

          <span className="text-gray-500 text-xs">
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
        <div key={item.id} className="bg-white/[0.03] rounded-2xl p-5">
          <p className="font-semibold">{memberMap[item.member_id]}</p>

          <p
            className={
              item.points >= 0
                ? "text-yellow-400 font-bold"
                : "text-red-400 font-bold"
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
