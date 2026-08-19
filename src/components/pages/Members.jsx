import { useState } from "react";
import logo from "../../assets/club-logo.png";
import { ROLE_NAMES, SYSTEM_ROLE_DEFINITIONS } from "../../constants/roles";
import { getRoleDisplayName } from "../../lib/roleHelpers";
import SafeImage from "../common/SafeImage";

function formatMemberJoinDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Members({
  members,
  currentUserId,
  currentUserRole,
  canEdit,
  canManageRoles,
  roleDefinitions,
  onRoleChange,
  onToggleActive,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const availableRoles = roleDefinitions?.length
    ? roleDefinitions
    : SYSTEM_ROLE_DEFINITIONS;

  const roleName = (roleKey) =>
    getRoleDisplayName(roleKey, availableRoles);

  const canModifyTarget = (member) => {
    if (currentUserRole === "head_admin") {
      return true;
    }

    if (
      currentUserRole === "administrator" &&
      member.role === "head_admin"
    ) {
      return false;
    }

    return currentUserRole === "administrator";
  };

  const pendingMembers = members.filter(
    (member) =>
      member.role === "guest" &&
      member.is_active !== false,
  );

  const filteredMembers = members.filter((member) => {
    const searchable = [
      member.full_name,
      member.nickname,
      member.email,
      ROLE_NAMES[member.role],
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !search.trim() ||
      searchable.includes(search.trim().toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" &&
        member.role === "guest" &&
        member.is_active !== false) ||
      (statusFilter === "active" &&
        member.is_active !== false &&
        member.role !== "guest") ||
      (statusFilter === "inactive" &&
        member.is_active === false);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
        <div className="nexus-glow-yellow w-72 h-72 -top-20 -right-20" />
        <div className="nexus-glow-purple w-72 h-72 -bottom-20 -left-20" />

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">

          <div>
            <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
              Administration
            </p>

            <h2 className="text-3xl font-black mt-1">
              <span className="nexus-text-aurora">Member</span>{" "}
              <span className="nexus-text-ocean">Management</span>
            </h2>

            <p className="text-gray-500 mt-2">
              Review join requests and manage member roles and account status.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-2xl bg-yellow-400/10 border border-yellow-400/30 backdrop-blur-md px-4 py-3 min-w-28 shadow-[0_0_22px_rgba(250,204,21,0.18)]">
              <p className="text-yellow-300 text-xs uppercase font-bold">
                Pending
              </p>

              <p className="text-2xl font-black mt-1 text-yellow-300">
                {pendingMembers.length}
              </p>
            </div>

            <div className="nexus-glass-flat rounded-2xl px-4 py-3 min-w-28">
              <p className="text-gray-500 text-xs uppercase font-bold">
                Total
              </p>

              <p className="text-2xl font-black mt-1">
                {members.length}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Pending requests */}
      {pendingMembers.length > 0 && (
        <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden border-yellow-400/30">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/[0.06] via-transparent to-purple-500/[0.06] pointer-events-none" />

          <div className="relative flex items-center justify-between gap-4">

            <div>
              <p className="nexus-text-aurora text-sm font-bold uppercase tracking-wider">
                Needs Review
              </p>

              <h3 className="text-2xl font-black mt-1">
                Pending Join Requests
              </h3>

              <p className="text-gray-500 text-sm mt-1">
                Approve a request to turn the account into a regular member.
              </p>
            </div>

            <span className="nexus-chip-gradient">
              {pendingMembers.length}
            </span>

          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">

            {pendingMembers.map((member) => {

              const canModify =
                canEdit &&
                member.id !== currentUserId &&
                canModifyTarget(member);

              return (
                <div
                  key={member.id}
                  className="rounded-2xl nexus-glass-flat border-yellow-400/20 p-4 hover:border-yellow-400/40 transition"
                >

                  <div className="flex items-center gap-3">

                    <div className="relative shrink-0">
                      <div className="absolute inset-0 rounded-full bg-gradient-aurora blur-sm opacity-60" />
                      <SafeImage
                        src={member.avatar_url || logo}
                        alt=""
                        className="relative w-12 h-12 rounded-full object-cover border border-white/20"
                      />
                    </div>

                    <div className="min-w-0">

                      <p className="font-semibold truncate">
                        {member.nickname || member.full_name}
                      </p>

                      {member.email && (
                        <p className="text-gray-500 text-xs truncate">
                          {member.email}
                        </p>
                      )}

                    </div>
                  </div>

                  <button
                    disabled={!canModify}
                    onClick={() =>
                      onRoleChange(member.id, "member")
                    }
                    className="nexus-morphic-button w-full mt-4 px-4 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Approve & Make Member
                  </button>

                </div>
              );
            })}

          </div>
        </section>
      )}

      {/* Search and filters */}
      <section className="nexus-glass-strong rounded-3xl p-5">

        <div className="grid md:grid-cols-[1fr_auto] gap-3">

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search name, email, or role..."
            className="nexus-input"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            className="nexus-select"
          >
            <option value="all">
              All accounts
            </option>

            <option value="pending">
              Pending requests
            </option>

            <option value="active">
              Active members
            </option>

            <option value="inactive">
              Inactive accounts
            </option>
          </select>

        </div>

        <p className="text-xs text-gray-500 mt-3">
          Showing <span className="text-yellow-300 font-bold">{filteredMembers.length}</span> of {members.length} accounts
        </p>

      </section>

      {/* Members */}
      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">

        {filteredMembers.map((member) => {

          const isCurrentUser =
            member.id === currentUserId;

          const canModify =
            canEdit &&
            !isCurrentUser &&
            canModifyTarget(member);

          return (
            <article
              key={member.id}
              className={`nexus-glass-strong rounded-3xl p-5 relative overflow-hidden hover:-translate-y-1 transition ${
                member.role === "guest" &&
                member.is_active !== false
                  ? "border-yellow-400/30 shadow-[0_0_24px_rgba(250,204,21,0.18)]"
                  : ""
              }`}
            >

              <div className="relative flex items-start justify-between gap-3">

                <div className="flex items-center gap-3 min-w-0">

                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-full bg-gradient-aurora blur-sm opacity-50" />
                    <SafeImage
                      src={member.avatar_url || logo}
                      alt=""
                      className="relative w-12 h-12 rounded-full object-cover border border-white/20"
                    />
                  </div>

                  <div className="min-w-0">

                    <h3 className="font-bold truncate">
                      {member.nickname || member.full_name}
                    </h3>

                    <p className="text-yellow-300 text-xs mt-1 font-semibold">
                      {ROLE_NAMES[member.role] ||
                        member.role}
                    </p>

                    <p
                      className={`text-[11px] mt-1 font-semibold ${
                        member.is_active === false
                          ? "text-red-300"
                          : member.role === "guest"
                            ? "text-yellow-300"
                            : "text-green-300"
                      }`}
                    >
                      {member.is_active === false
                        ? "Account inactive"
                        : member.role === "guest"
                          ? "Awaiting approval"
                          : "Active account"}
                    </p>

                  </div>
                </div>

                {member.role === "guest" &&
                  member.is_active !== false && (
                    <span className="nexus-badge-yellow">
                      PENDING
                    </span>
                  )}

              </div>

              {/* Member stats */}
              <div className="mt-5 grid sm:grid-cols-3 gap-2">

                <div className="rounded-xl nexus-glass-flat p-3">

                  <p className="text-gray-500 text-[10px] uppercase font-bold">
                    Points
                  </p>

                  <p className="font-black mt-1 nexus-text-aurora">
                    {member.points ?? 0}
                  </p>

                </div>

                <div className="rounded-xl nexus-glass-flat p-3">

                  <p className="text-gray-500 text-[10px] uppercase font-bold">
                    Status
                  </p>

                  <p
                    className={`font-black mt-1 ${
                      member.is_active === false
                        ? "text-red-300"
                        : "text-green-300"
                    }`}
                  >
                    {member.is_active === false
                      ? "Inactive"
                      : "Active"}
                  </p>

                </div>

                <div className="rounded-xl nexus-glass-flat p-3">

                  <p className="text-gray-500 text-[10px] uppercase font-bold">
                    Joined
                  </p>

                  <p className="font-bold mt-1 text-sm">
                    {formatMemberJoinDate(
                      member.created_at
                    )}
                  </p>

                </div>

              </div>

              {/* Controls */}
              <div className="flex flex-wrap gap-2 mt-4">

                {/* Approve guest */}
                {canModify &&
                  member.role === "guest" &&
                  member.is_active && (
                    <button
                      onClick={() =>
                        onRoleChange(
                          member.id,
                          "member"
                        )
                      }
                      className="nexus-morphic-button flex-1 min-w-40 px-3 py-2.5"
                    >
                      Approve
                    </button>
                  )}

                {/* Change role */}
                {canModify &&
                  member.role !== "guest" &&
                  member.is_active && (
                    <select
                      value={member.role}
                      onChange={(event) =>
                        onRoleChange(
                          member.id,
                          event.target.value
                        )
                      }
                      className="nexus-select flex-1 min-w-40"
                    >

                      {availableRoles
                        .filter(
                          (role) =>
                            isCurrentUser ||
                            role.role_key !==
                              "head_admin" ||
                            currentUserRole ===
                              "head_admin",
                        )
                        .map((role) => (
                          <option
                            key={role.role_key}
                            value={role.role_key}
                          >
                            {role.name ||
                              roleName(
                                role.role_key
                              )}
                          </option>
                        ))}

                    </select>
                  )}

                {/* Activate / deactivate */}
                {canModify && (
                  <button
                    onClick={() =>
                      onToggleActive(
                        member.id,
                        !member.is_active
                      )
                    }
                    className={`px-3 py-2.5 rounded-xl text-sm font-semibold transition backdrop-blur-md ${
                      member.is_active
                        ? "bg-red-500/10 text-red-300 border border-red-400/20 hover:bg-red-500/20"
                        : "bg-green-500/10 text-green-300 border border-green-400/20 hover:bg-green-500/20"
                    }`}
                  >
                    {member.is_active
                      ? "Deactivate"
                      : "Reactivate"}
                  </button>
                )}

                {/* Current user */}
                {isCurrentUser && (
                  <span className="w-full text-center nexus-text-aurora text-xs py-2 font-bold">
                    This is your account
                  </span>
                )}

                {/* Protected Head Admin */}
                {!canModify &&
                  !isCurrentUser &&
                  member.role === "head_admin" &&
                  currentUserRole === "administrator" && (
                    <span className="w-full text-center text-gray-600 text-xs py-2">
                      Protected Head Admin account
                    </span>
                  )}

              </div>

            </article>
          );
        })}

      </section>

      {/* Empty state */}
      {filteredMembers.length === 0 && (
        <div className="text-center py-14 nexus-glass-strong rounded-3xl">

          <div className="text-4xl">🔍</div>
          <p className="text-gray-500 mt-3">
            No accounts match your filters.
          </p>

          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="mt-5 nexus-morphic-button-ghost px-5 py-2.5"
          >
            Clear Filters
          </button>

        </div>
      )}

    </div>
  );
}

export default Members;
