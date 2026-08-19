import logo from "../../assets/club-logo.png";
import { ROLE_NAMES } from "../../constants/roles";
import SafeImage from "../common/SafeImage";
import Stat from "../common/Stat";
import { PersonalPointHistory } from "../common/PointHistory";

function Overview({
  profile,
  rankedMembers,
  news,
  currentRank,
  pointHistory,
  previousMonth,
}) {
  const topFive = rankedMembers.slice(0, 5);

  const monthLabel = previousMonth?.month_start
    ? new Date(`${previousMonth.month_start}T00:00:00`).toLocaleDateString(
        undefined,
        {
          month: "long",
          year: "numeric",
        },
      )
    : null;

  const latestNews = news.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="relative overflow-hidden nexus-glass-strong rounded-3xl p-6 md:p-8">
        <div className="nexus-glow-yellow w-72 h-72 -right-20 -top-24" />
        <div className="nexus-glow-purple w-64 h-64 -left-10 -bottom-20" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-xs font-bold uppercase tracking-wider">
              <span className="nexus-dot-glow" />
              Welcome back
            </span>

            <h2 className="text-3xl md:text-5xl font-black mt-3 leading-tight">
              <span className="nexus-text-aurora">
                {profile.nickname || profile.full_name}
              </span>
            </h2>

            <p className="text-gray-400 mt-2">{ROLE_NAMES[profile.role]}</p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-aurora blur-xl opacity-50" />
            <SafeImage
              src={profile.avatar_url || logo}
              alt=""
              className="relative w-16 h-16 rounded-2xl object-cover border-2 border-white/20"
            />
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Stat
          title="Total Members"
          value={rankedMembers.length}
          tone="purple"
          icon="👥"
        />

        <Stat
          title="Your Points"
          value={profile.points ?? 0}
          tone="yellow"
          icon="🏆"
        />

        <Stat
          title="Your Rank"
          value={currentRank > 0 ? `#${currentRank}` : "—"}
          tone="cyan"
          icon="📈"
        />

        <Stat
          title="Your Role"
          value={ROLE_NAMES[profile.role]}
          tone="pink"
          icon="✨"
        />
      </section>

      {/* Main dashboard */}
      <section className="grid xl:grid-cols-[1.15fr_0.85fr] gap-5 items-start">
        {/* Leaderboard */}
        <div className="nexus-glass-strong rounded-3xl p-5 md:p-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-yellow-400/10 blur-3xl pointer-events-none" />

          <div className="relative flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
                Current Month
              </p>

              <h3 className="text-2xl md:text-3xl font-black mt-1">
                Top 5 Leaderboard
              </h3>
            </div>

            <span className="nexus-badge-yellow">
              {topFive.length} ranked
            </span>
          </div>

          {topFive.length === 0 ? (
            <p className="text-gray-500 py-8">No members yet.</p>
          ) : (
            <div className="space-y-2.5">
              {topFive.map((member, index) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 border transition ${
                    member.id === profile.id
                      ? "bg-gradient-to-r from-yellow-400/15 to-purple-500/10 border-yellow-400/30 shadow-[0_0_24px_rgba(250,204,21,0.18)]"
                      : "nexus-glass-flat hover:border-yellow-400/30 hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 text-center font-black ${
                        index === 0
                          ? "nexus-text-aurora"
                          : index === 1
                            ? "text-purple-300"
                            : index === 2
                              ? "text-cyan-300"
                              : "text-gray-500"
                      }`}
                    >
                      #{index + 1}
                    </span>

                    <SafeImage
                      src={member.avatar_url || logo}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/10"
                    />

                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {member.nickname || member.full_name}
                      </p>

                      <p className="text-gray-500 text-xs truncate">
                        {ROLE_NAMES[member.role] || member.role}
                      </p>
                    </div>
                  </div>

                  <span className="font-black shrink-0 nexus-text-aurora">
                    {member.points ?? 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest news */}
        <div className="nexus-glass-strong rounded-3xl p-5 md:p-6 relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="nexus-text-ocean text-xs font-bold uppercase tracking-wider">
                Club Updates
              </p>

              <h3 className="text-2xl md:text-3xl font-black mt-1">
                Latest News
              </h3>
            </div>

            <span className="nexus-badge-cyan">{news.length} total</span>
          </div>

          {latestNews.length === 0 ? (
            <p className="text-gray-500 py-8">No news published yet.</p>
          ) : (
            <div className="space-y-3">
              {latestNews.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden nexus-glass-flat rounded-2xl hover:border-yellow-400/30 transition"
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title || "News attachment"}
                      className="w-full h-32 object-cover"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}

                  <div className="p-4">
                    <h4 className="font-bold">{item.title}</h4>

                    <p className="text-gray-400 text-sm mt-1.5 line-clamp-3 whitespace-pre-wrap">
                      {item.content}
                    </p>

                    {item.created_at && (
                      <p className="text-gray-600 text-xs mt-3">
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Previous month standouts */}
      <section className="nexus-glass-strong rounded-3xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -top-10 right-1/3 w-56 h-56 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

        <div className="relative mb-5">
          <p className="nexus-text-sunset text-xs font-bold uppercase tracking-wider">
            {monthLabel || "Previous Month"}
          </p>

          <h3 className="text-2xl md:text-3xl font-black mt-1">
            Monthly Standouts
          </h3>
        </div>

        {!previousMonth ? (
          <div className="rounded-2xl nexus-glass-flat p-6">
            <p className="text-gray-500">
              No previous month has been completed yet.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gradient-to-br from-yellow-400/15 to-amber-500/10 border border-yellow-400/30 p-5 backdrop-blur-md shadow-[0_0_30px_rgba(250,204,21,0.18)]">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🏆</div>

                <div className="min-w-0">
                  <p className="nexus-text-aurora text-xs font-black uppercase tracking-wider">
                    Top Performer
                  </p>

                  <h4 className="text-xl font-black mt-1 truncate">
                    {previousMonth.first_place_name || "Unknown"}
                  </h4>

                  <p className="text-gray-400 text-sm mt-1">
                    {previousMonth.first_place_points ?? 0} points
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl nexus-glass-flat border-purple-400/20 p-5">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🥈</div>

                <div className="min-w-0">
                  <p className="text-purple-300 text-xs font-bold uppercase tracking-wider">
                    Runner Up
                  </p>

                  <h4 className="text-xl font-black mt-1 truncate">
                    {previousMonth.second_place_name || "Unknown"}
                  </h4>

                  <p className="text-gray-400 text-sm mt-1">
                    {previousMonth.second_place_points ?? 0} points
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Personal history */}
      <section className="nexus-glass-strong rounded-3xl p-5 md:p-6 relative overflow-hidden">
        <div className="absolute -bottom-10 right-10 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-gray-500 text-sm">Your activity</p>

            <h3 className="text-xl font-black mt-1">My Point History</h3>
          </div>

          <span className="nexus-badge-cyan">
            {pointHistory.length} records
          </span>
        </div>

        <div className="mt-4">
          {pointHistory.length === 0 ? (
            <p className="text-gray-500">No point records yet.</p>
          ) : (
            <PersonalPointHistory history={pointHistory} />
          )}
        </div>
      </section>
    </div>
  );
}

export default Overview;
