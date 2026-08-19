import { useState } from "react";
import logo from "../../assets/club-logo.png";
import { ROLE_NAMES, SYSTEM_ROLE_DEFINITIONS } from "../../constants/roles";
import { getRoleDisplayName } from "../../lib/roleHelpers";
import SafeImage from "../common/SafeImage";

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

  const roleName = (roleKey) => getRoleDisplayName(roleKey, availableRoles);

  const canModifyTarget = (member) => {
    if (currentUserRole === "head_admin") {
      return true;
    }

    if (currentUserRole === "administrator" && member.role === "head_admin") {
      return false;
    }

    return currentUserRole === "administrator";
  };

  const pendingMembers = members.filter(
    (member) => member.role === "guest" && member.is_active !== false,
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
      !search.trim() || searchable.includes(search.trim().toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" &&
        member.role === "guest" &&
        member.is_active !== false) ||
      (statusFilter === "active" &&
        member.is_active !== false &&
        member.role !== "guest") ||
      (statusFilter === "inactive" && member.is_active === false);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="text-yellow-400 text-sm font-semibold">
              Administration
            </p>

            <h2 className="text-3xl font-black mt-1">Member Management</h2>

            <p className="text-gray-500 mt-2">
              Review join requests and manage member roles and account status.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-yellow-400/10 border border-yellow-400/20 px-4 py-3 min-w-28">
              <p className="text-yellow-400 text-xs">Pending</p>
              <p className="text-2xl font-black mt-1">
                {pendingMembers.length}
              </p>
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3 min-w-28">
              <p className="text-gray-500 text-xs">Total</p>
              <p className="text-2xl font-black mt-1">{members.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pending requests */}
      {pendingMembers.length > 0 && (
        <section className="bg-yellow-400/[0.045] border border-yellow-400/20 rounded-3xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-yellow-400 text-sm font-semibold">
                Needs Review
              </p>

              <h3 className="text-2xl font-black mt-1">
                Pending Join Requests
              </h3>

              <p className="text-gray-500 text-sm mt-1">
                Approve a request to turn the account into a regular member.
              </p>
            </div>

            <span className="px-3 py-1.5 rounded-full bg-yellow-400 text-black text-xs font-black">
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
                  className="rounded-2xl bg-black/10 border border-yellow-400/10 p-4"
                >
                  <div className="flex items-center gap-3">
                    <SafeImage
                      src={member.avatar_url || logo}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />

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
                    onClick={() => onRoleChange(member.id, "member")}
                    className="w-full mt-4 px-4 py-2.5 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
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
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5">
        <div className="grid md:grid-cols-[1fr_auto] gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, or role..."
            className="w-full rounded-xl bg-black/20 border border-white/10 px-4 py-3 outline-none focus:border-yellow-400/40"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl bg-black/20 border border-white/10 px-4 py-3 outline-none"
          >
            <option value="all">All accounts</option>
            <option value="pending">Pending requests</option>
            <option value="active">Active members</option>
            <option value="inactive">Inactive accounts</option>
          </select>
        </div>

        <p className="text-xs text-gray-600 mt-3">
          Showing {filteredMembers.length} of {members.length} accounts
        </p>
      </section>

      {/* Members */}
      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const isCurrentUser = member.id === currentUserId;

          const canModify =
            canEdit && !isCurrentUser && canModifyTarget(member);

          return (
            <article
              key={member.id}
              className={`bg-white/[0.04] border rounded-3xl p-5 ${
                member.role === "guest" && member.is_active !== false
                  ? "border-yellow-400/20"
                  : "border-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <SafeImage
                    src={member.avatar_url || logo}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />

                  <div className="min-w-0">
                    <h3 className="font-bold truncate">
                      {member.nickname || member.full_name}
                    </h3>

                    <p className="text-yellow-400 text-xs mt-1">
                      {ROLE_NAMES[member.role] || member.role}
                    </p>

                    <p
                      className={`text-[11px] mt-1 ${
                        member.is_active === false
                          ? "text-red-400"
                          : member.role === "guest"
                            ? "text-yellow-300"
                            : "text-green-400"
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

                {member.role === "guest" && member.is_active !== false && (
                  <span className="px-2 py-1 rounded-lg bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-[10px] font-bold">
                    PENDING
                  </span>
                )}
              </div>

              <div className="mt-5 grid sm:grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-gray-600 text-[10px] uppercase">Points</p>
                  <p className="font-bold mt-1">{member.points ?? 0}</p>
                </div>

                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-gray-600 text-[10px] uppercase">Status</p>
                  <p
                    className={`font-bold mt-1 ${
                      member.is_active === false
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {member.is_active === false ? "Inactive" : "Active"}
                  </p>
                </div>

                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-gray-600 text-[10px] uppercase">Joined</p>
                  <p className="font-bold mt-1 text-sm">
                    {formatMemberJoinDate(member.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                {canModify && member.role === "guest" && member.is_active && (
                  <button
                    onClick={() => onRoleChange(member.id, "member")}
                    className="flex-1 min-w-40 px-3 py-2.5 bg-yellow-400 text-black rounded-xl font-bold hover:bg-yellow-300 transition"
                  >
                    Approve
                  </button>
                )}

                {canModify && member.role !== "guest" && member.is_active && (
                  <select
                    value={member.role}
                    onChange={(event) =>
                      onRoleChange(member.id, event.target.value)
                    }
                    className="flex-1 min-w-40 bg-[#18181b] border border-white/10 rounded-xl px-3 py-2.5"
                  >
                    {availableRoles
                      .filter(
                        (role) =>
                          isCurrentUser ||
                          role.role_key !== "head_admin" ||
                          currentUserRole === "head_admin",
                      )
                      .map((role) => (
                        <option key={role.role_key} value={role.role_key}>
                          {role.name || roleName(role.role_key)}
                        </option>
                      ))}
                  </select>
                )}

                {canModify && (
                  <button
                    onClick={() => onToggleActive(member.id, !member.is_active)}
                    className={`px-3 py-2.5 rounded-xl ${
                      member.is_active
                        ? "bg-red-500/10 text-red-400 border border-red-400/10"
                        : "bg-green-500/10 text-green-400 border border-green-400/10"
                    }`}
                  >
                    {member.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                )}

                {isCurrentUser && (
                  <span className="w-full text-center text-yellow-400 text-xs py-2">
                    This is your account
                  </span>
                )}

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

      {filteredMembers.length === 0 && (
        <div className="text-center py-14 bg-white/[0.03] border border-white/10 rounded-3xl">
          <p className="text-gray-500">No accounts match your filters.</p>

          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="mt-4 px-4 py-2 bg-yellow-400 text-black rounded-xl font-semibold"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default Members;
