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
    <div className="min-h-screen bg-[#0b0b0d] text-white">
      <Header profile={profile} onLogout={onLogout} />

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-5 sm:py-10">
        <section className="bg-white/[0.04] border border-yellow-400/20 rounded-3xl p-5 sm:p-8 mb-5 sm:mb-8">
          <p className="text-gray-400">
            Welcome, {profile.nickname || profile.full_name}
          </p>

          <h2 className="text-3xl font-bold mt-2">Your account is pending</h2>

          <p className="text-gray-400 mt-4">
            An administrator needs to promote your account before you become a
            club member.
          </p>

          <div className="inline-flex mt-5 px-4 py-2 rounded-full bg-yellow-400/10 text-yellow-400 text-sm">
            Guest
          </div>
        </section>

        <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
          <h3 className="text-2xl font-bold mb-5">Club News</h3>

          {news.length === 0 ? (
            <p className="text-gray-500">No news published yet.</p>
          ) : (
            <div className="space-y-4">
              {news.map((item) => (
                <div key={item.id} className="bg-white/[0.03] rounded-2xl p-4">
                  <h4 className="font-semibold">{item.title}</h4>

                  <p className="text-gray-400 mt-2">{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


export default GuestDashboard;
