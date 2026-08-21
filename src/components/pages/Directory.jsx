import { useState } from "react";
import logo from "../../assets/club-logo.png";
import { ROLE_NAMES } from "../../constants/roles";
import SafeImage from "../common/SafeImage";

function Directory({ members }) {
  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  /*
    Guests and inactive accounts stay private.
  */
  const publicMembers = members.filter(
    (member) => member.role !== "guest" && member.is_active !== false,
  );

  const filtered = publicMembers.filter((member) => {
    const name = `${member.full_name || ""} ${
      member.nickname || ""
    }`.toLowerCase();

    return (
      name.includes(search.toLowerCase()) &&
      (filter === "all" || member.role === filter)
    );
  });

  return (
    <section className="space-y-6">
      <div className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative">
          <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
            Community
          </p>

          <h2 className="text-3xl font-black mt-1">
            <span className="nexus-text-aurora">Member</span>{" "}
            <span className="nexus-text-ocean">Directory</span>
          </h2>

          <p className="text-gray-500 mt-2">Browse active club members.</p>
        </div>
      </div>

      <div className="nexus-glass-strong rounded-3xl p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="nexus-input flex-1"
          />
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {[
            ["all", "All", "yellow"],
            ["member", "Members", "cyan"],
            ["executive", "Executives", "purple"],
            ["administrator", "Administrators", "pink"],
            ["head_admin", "Head Admins", "red"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`nexus-tab-pill${filter === value ? " is-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((member) => (
          <div
            key={member.id}
            className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden hover:-translate-y-1 transition group"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-yellow-400/15 via-purple-500/10 to-cyan-400/15 blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition" />

            <div className="relative flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-aurora blur-md opacity-50" />
                <SafeImage
                  src={member.avatar_url || logo}
                  alt={member.nickname || member.full_name}
                  className="relative w-24 h-24 rounded-full object-cover nexus-image-frame"
                />
              </div>
            </div>

            <div className="text-center mt-4">
              <h3 className="text-xl font-black">
                {member.nickname || member.full_name}
              </h3>

              <p className="text-yellow-300 text-sm mt-2 font-semibold">
                {ROLE_NAMES[member.role]}
              </p>

              <p className="text-3xl font-black mt-4 nexus-text-aurora">
                {member.points}
              </p>

              <p className="text-gray-500 text-xs uppercase tracking-wider">
                points
              </p>

              <p className="text-gray-400 text-sm mt-4 line-clamp-3">
                {member.bio || "No bio yet."}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 nexus-glass-strong nexus-glass-dashed rounded-3xl">
          <div className="text-4xl">🔍</div>
          <p className="text-gray-500 mt-4">No members found.</p>

          <button
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
            className="mt-5 nexus-morphic-button-ghost px-5 py-2.5"
          >
            Clear Filters
          </button>
        </div>
      )}
    </section>
  );
}

export default Directory;
