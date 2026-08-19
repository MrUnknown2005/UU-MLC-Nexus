import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Header from "../common/Header";

function GuestDashboard({ profile, onLogout }) {
  const [news, setNews] = useState([]);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    const { data } = await supabase
      .from("news")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    setNews(data || []);
  };

  return (
    <div className="nexus-app-bg min-h-screen text-white">
      {/* Glow blobs */}
      <div className="nexus-glow-yellow w-[22rem] h-[22rem] -top-32 -left-32" />
      <div className="nexus-glow-purple w-[26rem] h-[26rem] top-1/3 -right-32" />
      <div className="nexus-glow-cyan w-[20rem] h-[20rem] bottom-0 left-1/4" />

      <div className="relative z-10">
        <Header profile={profile} onLogout={onLogout} />

        <main className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-10 space-y-5 sm:space-y-8">
          <section className="nexus-glass-strong rounded-3xl p-5 sm:p-8 relative overflow-hidden">
            <div className="nexus-glow-yellow w-72 h-72 -top-20 -right-20" />
            <div className="nexus-glow-purple w-72 h-72 -bottom-20 -left-20" />

            <div className="relative">
              <span className="nexus-glass-pill-yellow text-[10px] tracking-[0.2em]">
                <span className="nexus-dot-glow" />
                Pending
              </span>

              <p className="text-gray-400 mt-4">
                Welcome,{" "}
                <span className="nexus-text-aurora font-bold">
                  {profile.nickname || profile.full_name}
                </span>
              </p>

              <h2 className="text-3xl sm:text-5xl font-black mt-2">
                <span className="nexus-text-aurora">Your account</span>{" "}
                <span className="nexus-text-ocean">is pending</span>
              </h2>

              <p className="text-gray-400 mt-4 max-w-2xl">
                An administrator needs to promote your account before you
                become a full club member. Hang tight — exciting things are
                happening in the meantime.
              </p>

              <div className="flex flex-wrap gap-2 mt-6">
                <span className="nexus-badge-yellow">
                  Guest
                </span>
                <span className="nexus-badge-purple">
                  Awaiting Approval
                </span>
                <span className="nexus-badge-cyan">
                  {profile.points ?? 0} pts
                </span>
              </div>
            </div>
          </section>

          <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
            <div className="nexus-glass-overlay-aurora absolute -top-10 right-10 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

            <div className="relative">
              <p className="nexus-text-ocean text-xs font-bold uppercase tracking-wider">
                Updates
              </p>

              <h3 className="text-2xl font-black mt-1 mb-5">
                Club News
              </h3>

              {news.length === 0 ? (
                <div className="text-center py-10 nexus-glass-flat nexus-glass-dashed rounded-2xl">
                  <div className="text-4xl">📰</div>
                  <p className="text-gray-500 mt-3">
                    No news published yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {news.map((item) => (
                    <article
                      key={item.id}
                      className="nexus-glass-flat nexus-glass-hover rounded-2xl p-5"
                    >
                      <h4 className="font-black text-lg">
                        {item.title}
                      </h4>

                      <p className="text-gray-400 mt-2 whitespace-pre-wrap">
                        {item.content}
                      </p>

                      {item.created_at && (
                        <p className="text-gray-600 text-xs mt-3">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default GuestDashboard;
