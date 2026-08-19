import { useState } from "react";
import logo from "../../assets/club-logo.png";
import { ROLE_NAMES } from "../../constants/roles";
import SafeImage from "../common/SafeImage";

function AdminActivity({ activityLog, members = [], isHeadAdmin, onWipe }) {
  const [search, setSearch] = useState("");

  const [actionFilter, setActionFilter] = useState("all");

  const [actorFilter, setActorFilter] = useState("all");

  const getMember = (id) => members.find((member) => member.id === id);

  const actionTypes = [
    ...new Set(activityLog.map((item) => item.action).filter(Boolean)),
  ];

  const actorIds = [
    ...new Set(activityLog.map((item) => item.admin_id).filter(Boolean)),
  ];

  const actionLabel = (action) =>
    String(action || "UNKNOWN")
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const actionTone = (action) => {
    const value = String(action || "");

    if (
      value.includes("WIPE") ||
      value.includes("DELETE") ||
      value.includes("DEACTIVATED")
    ) {
      return "bg-red-500/10 text-red-300 border-red-400/30";
    }

    if (
      value.includes("POINT") ||
      value.includes("PROMOT") ||
      value.includes("ROLE")
    ) {
      return "bg-yellow-400/10 text-yellow-300 border-yellow-400/30";
    }

    if (value.includes("TODO") || value.includes("NEWS")) {
      return "bg-cyan-400/10 text-cyan-300 border-cyan-400/30";
    }

    if (value.includes("PROFILE")) {
      return "bg-purple-500/10 text-purple-200 border-purple-400/30";
    }

    return "bg-white/[0.04] text-gray-300 border-white/10";
  };

  const filtered = activityLog.filter((item) => {
    const actor = getMember(item.admin_id);

    const target = getMember(item.target_user_id);

    const actorName = actor?.nickname || actor?.full_name || "Unknown admin";

    const targetName =
      target?.nickname || target?.full_name || "Unknown member";

    const searchable = [
      actorName,
      targetName,
      item.action,
      item.details,
      item.created_at,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search.trim() || searchable.includes(search.trim().toLowerCase());

    const matchesAction =
      actionFilter === "all" || item.action === actionFilter;

    const matchesActor = actorFilter === "all" || item.admin_id === actorFilter;

    return matchesSearch && matchesAction && matchesActor;
  });

  return (
    <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
      <div className="nexus-glow-purple w-72 h-72 -top-20 -right-20" />

      <div className="relative flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div>
          <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
            Accountability
          </p>

          <h2 className="text-2xl font-black mt-1">
            Admin Activity{" "}
            <span className="nexus-text-ocean">History</span>
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            See who did what, who it affected, and exactly when it happened.
          </p>
        </div>

        {isHeadAdmin && (
          <button
            onClick={onWipe}
            className="nexus-morphic-button-danger px-5 py-3"
          >
            Wipe Activity History
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr_1fr] gap-3 mt-6">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search actor, target, action, or details..."
          className="nexus-input text-sm"
        />

        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          className="nexus-select text-sm"
        >
          <option value="all">All actions</option>

          {actionTypes.map((action) => (
            <option key={action} value={action}>
              {actionLabel(action)}
            </option>
          ))}
        </select>

        <select
          value={actorFilter}
          onChange={(event) => setActorFilter(event.target.value)}
          className="nexus-select text-sm"
        >
          <option value="all">All actors</option>

          {actorIds.map((id) => {
            const actor = getMember(id);

            return (
              <option key={id} value={id}>
                {actor?.nickname || actor?.full_name || "Unknown admin"}
              </option>
            );
          })}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-gray-500">
        <span>
          Showing <span className="text-yellow-300 font-bold">{filtered.length}</span> of {activityLog.length} activities
        </span>

        {(search || actionFilter !== "all" || actorFilter !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setActionFilter("all");
              setActorFilter("all");
            }}
            className="text-yellow-300 hover:text-yellow-200 font-bold"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-gray-500 text-center py-12">
          No matching administrative activity found.
        </div>
      ) : (
        <div className="space-y-3 mt-5">
          {filtered.map((item) => {
            const actor = getMember(item.admin_id);

            const target = getMember(item.target_user_id);

            const actorName =
              actor?.nickname || actor?.full_name || "Unknown admin";

            const targetName = target?.nickname || target?.full_name || null;

            return (
              <div
                key={item.id}
                className="nexus-glass-flat rounded-2xl p-4 hover:border-yellow-400/30 hover:bg-white/[0.06] transition"
              >
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-full bg-gradient-aurora blur-sm opacity-50" />
                    <SafeImage
                      src={actor?.avatar_url || logo}
                      alt=""
                      className="relative w-11 h-11 rounded-full object-cover border border-white/20"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">
                        {actorName}
                      </span>

                      <span className="text-gray-500">→</span>

                      <span
                        className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${actionTone(
                          item.action,
                        )}`}
                      >
                        {actionLabel(item.action)}
                      </span>

                      {actor?.role && (
                        <span className="px-2 py-1 rounded-lg nexus-glass-flat text-gray-400 text-xs font-semibold">
                          {ROLE_NAMES[actor.role] || actor.role}
                        </span>
                      )}
                    </div>

                    {targetName && (
                      <p className="text-sm text-gray-300 mt-2">
                        Target:{" "}
                        <span className="font-bold text-white">
                          {targetName}
                        </span>
                      </p>
                    )}

                    {item.details && (
                      <p className="text-sm text-gray-400 mt-1 whitespace-pre-wrap">
                        {item.details}
                      </p>
                    )}

                    <p className="text-xs text-gray-500 mt-3">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Unknown time"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AdminActivity;
