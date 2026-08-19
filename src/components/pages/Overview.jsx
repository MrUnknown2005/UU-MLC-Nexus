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
      <section className="relative overflow-hidden bg-white/[0.04] border border-white/10 rounded-3xl p-6 md:p-8">
        <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-yellow-400/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-yellow-400 text-sm font-semibold">
              Welcome back
            </p>

            <h2 className="text-3xl md:text-4xl font-black mt-1">
              {profile.nickname || profile.full_name}
            </h2>

            <p className="text-gray-500 mt-2">{ROLE_NAMES[profile.role]}</p>
          </div>

          <SafeImage
            src={profile.avatar_url || logo}
            alt=""
            className="w-16 h-16 rounded-2xl object-cover border border-white/10"
          />
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <Stat title="Total Members" value={rankedMembers.length} />

        <Stat title="Your Points" value={profile.points ?? 0} />

        <Stat
          title="Your Rank"
          value={currentRank > 0 ? `#${currentRank}` : "—"}
        />

        <Stat title="Your Role" value={ROLE_NAMES[profile.role]} />
      </section>

      {/* Main dashboard */}
      <section className="grid xl:grid-cols-[1.15fr_0.85fr] gap-5 items-start">
        {/* Leaderboard */}
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 md:p-6">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-yellow-400 text-sm font-semibold">
                Current Month
              </p>

              <h3 className="text-2xl md:text-3xl font-black mt-1">
                Top 5 Leaderboard
              </h3>
            </div>

            <span className="text-xs text-gray-600">
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
                      ? "bg-yellow-400/10 border-yellow-400/20"
                      : "bg-white/[0.025] border-white/5 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 text-center text-yellow-400 font-black">
                      #{index + 1}
                    </span>

                    <SafeImage
                      src={member.avatar_url || logo}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0"
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

                  <span className="font-black shrink-0">
                    {member.points ?? 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest news */}
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 md:p-6">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <p className="text-yellow-400 text-sm font-semibold">
                Club Updates
              </p>

              <h3 className="text-2xl md:text-3xl font-black mt-1">
                Latest News
              </h3>
            </div>

            <span className="text-xs text-gray-600">{news.length} total</span>
          </div>

          {latestNews.length === 0 ? (
            <p className="text-gray-500 py-8">No news published yet.</p>
          ) : (
            <div className="space-y-3">
              {latestNews.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden bg-white/[0.025] border border-white/5 rounded-2xl"
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
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 md:p-6">
        <div className="mb-5">
          <p className="text-yellow-400 text-sm font-semibold">
            {monthLabel || "Previous Month"}
          </p>

          <h3 className="text-2xl md:text-3xl font-black mt-1">
            Monthly Standouts
          </h3>
        </div>

        {!previousMonth ? (
          <div className="rounded-2xl bg-white/[0.025] border border-white/5 p-6">
            <p className="text-gray-500">
              No previous month has been completed yet.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-yellow-400/10 border border-yellow-400/20 p-5">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🏆</div>

                <div className="min-w-0">
                  <p className="text-yellow-400 text-xs font-bold uppercase tracking-wider">
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

            <div className="rounded-2xl bg-white/[0.025] border border-white/10 p-5">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🥈</div>

                <div className="min-w-0">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">
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
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-gray-500 text-sm">Your activity</p>

            <h3 className="text-xl font-bold mt-1">My Point History</h3>
          </div>

          <span className="text-xs text-gray-600">
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
