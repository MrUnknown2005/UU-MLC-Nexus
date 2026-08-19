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
    <section>
      <h2 className="text-3xl font-bold">Member Directory</h2>

      <p className="text-gray-500 mt-1">Browse active club members.</p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search members..."
        className="w-full md:w-96 mt-6 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
      />

      <div className="flex flex-wrap gap-2 mt-4 mb-6">
        {[
          ["all", "All"],
          ["member", "Members"],
          ["executive", "Executives"],
          ["administrator", "Administrators"],
          ["head_admin", "Head Admins"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-xl ${
              filter === value
                ? "bg-yellow-400 text-black"
                : "bg-white/5 text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((member) => (
          <div
            key={member.id}
            className="bg-white/[0.04] border border-white/10 rounded-3xl p-6"
          >
            <div className="flex justify-center">
              <SafeImage
                src={member.avatar_url || logo}
                alt={member.nickname || member.full_name}
                className="w-24 h-24 rounded-full object-cover"
              />
            </div>

            <div className="text-center mt-4">
              <h3 className="text-xl font-semibold">
                {member.nickname || member.full_name}
              </h3>

              <p className="text-yellow-400 text-sm mt-2">
                {ROLE_NAMES[member.role]}
              </p>

              <p className="text-2xl font-bold mt-4">{member.points}</p>

              <p className="text-gray-500 text-sm">points</p>

              <p className="text-gray-400 text-sm mt-4">
                {member.bio || "No bio yet."}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500">No members found.</p>

          <button
            onClick={() => {
              setSearch("");
              setFilter("all");
            }}
            className="mt-4 px-4 py-2 bg-yellow-400 text-black rounded-xl"
          >
            Clear Filters
          </button>
        </div>
      )}
    </section>
  );
}

export default Directory;
