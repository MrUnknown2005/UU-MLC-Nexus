import logo from "../../assets/club-logo.png";

function LandingPage({ onLogin, onJoin }) {
  return (
    <div className="nexus-app-bg min-h-screen text-white overflow-hidden relative">
      {/* Glow blobs */}
      <div className="nexus-glow-yellow w-[28rem] h-[28rem] -top-32 -left-32" />
      <div className="nexus-glow-purple w-[32rem] h-[32rem] top-1/3 -right-40" />
      <div className="nexus-glow-cyan w-[24rem] h-[24rem] bottom-0 left-1/3" />
      <div className="nexus-glow-pink w-[22rem] h-[22rem] top-10 right-1/3" />

      <div className="relative max-w-6xl mx-auto px-6 py-10 md:py-16 z-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-aurora opacity-50 blur-md" />
              <img
                src={logo}
                alt="UU MLC"
                className="relative w-12 h-12 object-contain rounded-xl ring-1 ring-white/20"
              />
            </div>
            <div>
              <p className="font-black text-base tracking-tight">UU MLC</p>
              <p className="text-[10px] text-yellow-300 uppercase tracking-[0.2em]">
                Nexus
              </p>
            </div>
          </div>

          <button
            onClick={onLogin}
            className="nexus-morphic-button-ghost text-sm sm:text-base"
          >
            Member Login
          </button>
        </header>

        <main className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center py-16 md:py-24">
          <section>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 text-sm backdrop-blur-md shadow-[0_0_24px_rgba(250,204,21,0.18)]">
              <span className="nexus-dot-glow" />
              Interweek • UU MLC
            </span>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight mt-6 leading-[0.95]">
              Learn.{" "}
              <span className="nexus-text-aurora">Build.</span>{" "}
              <span className="nexus-text-ocean">Lead.</span>
            </h1>

            <p className="text-gray-300 text-lg md:text-xl mt-6 max-w-2xl leading-relaxed">
              UU MLC Nexus is the club workspace for members, projects, points,
              tasks, news, and collaboration — all in one beautifully crafted
              place.
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <button
                onClick={onJoin}
                className="px-7 py-3.5 rounded-2xl font-bold text-black bg-gradient-aurora bg-[length:200%_200%] animate-grad-pan shadow-[0_12px_32px_rgba(139,92,246,0.35),0_6px_14px_rgba(250,204,21,0.22)] hover:brightness-110 hover:-translate-y-0.5 transition-all border border-white/25"
              >
                Join the Club →
              </button>
              <button
                onClick={onLogin}
                className="nexus-morphic-button-ghost px-7 py-3.5 rounded-2xl"
              >
                Member Login
              </button>
            </div>

            {/* Feature highlights row */}
            <div className="grid grid-cols-3 gap-3 mt-10 max-w-lg">
              {[
                { label: "Active", value: "Members", icon: "👥", color: "purple" },
                { label: "Track", value: "Points", icon: "🏆", color: "yellow" },
                { label: "Read", value: "News", icon: "📰", color: "cyan" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="nexus-glass rounded-2xl p-4 hover:-translate-y-1 transition"
                >
                  <div className="text-2xl">{item.icon}</div>
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-2">
                    {item.label}
                  </p>
                  <p className="font-bold mt-0.5 text-sm">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="nexus-glass-strong rounded-[2rem] p-7 relative">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-aurora opacity-[0.05] pointer-events-none" />
            <div className="relative flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-aurora blur-2xl opacity-50" />
                <img
                  src={logo}
                  alt="UU MLC logo"
                  className="relative w-36 h-36 object-contain drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]"
                />
              </div>

              <p className="mt-3 text-sm uppercase tracking-[0.3em] text-yellow-300/90">
                Machine Learning Club
              </p>
              <h3 className="text-2xl font-black mt-1 nexus-text-aurora">
                Nexus Workspace
              </h3>

              <div className="grid grid-cols-2 gap-3 w-full mt-7">
                {[
                  { icon: "🏆", label: "Points", grad: "from-yellow-400/20 to-amber-500/10" },
                  { icon: "👥", label: "Community", grad: "from-purple-500/20 to-fuchsia-500/10" },
                  { icon: "✓", label: "Tasks", grad: "from-cyan-400/20 to-blue-500/10" },
                  { icon: "📰", label: "News", grad: "from-pink-400/20 to-rose-500/10" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl bg-gradient-to-br ${item.grad} border border-white/10 backdrop-blur-md p-5 hover:scale-[1.03] transition-transform`}
                  >
                    <div className="text-2xl">{item.icon}</div>
                    <p className="font-semibold mt-2 text-white">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* Footer strip */}
        <footer className="mt-6 nexus-divider" />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} Uttara University MLC</p>
          <div className="flex gap-3">
            <span className="nexus-badge-yellow">ML</span>
            <span className="nexus-badge-purple">Community</span>
            <span className="nexus-badge-cyan">Innovation</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
