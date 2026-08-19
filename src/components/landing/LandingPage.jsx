import logo from "../../assets/club-logo.png";

function LandingPage({ onLogin, onJoin }) {
  return (
    <div className="min-h-screen bg-[#08090b] text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.16),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(234,179,8,0.08),transparent_35%)]" />
      <div className="relative max-w-6xl mx-auto px-6 py-10 md:py-16">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="UU MLC" className="w-12 h-12 object-contain" />
            <div>
              <p className="font-bold">UU MLC</p>
              <p className="text-xs text-gray-500">Nexus</p>
            </div>
          </div>
          <button
            onClick={onLogin}
            className="px-3 sm:px-4 py-2 rounded-xl border border-white/10 text-sm sm:text-base shrink-0 bg-white/5 hover:bg-white/10 transition"
          >
            Member Login
          </button>
        </header>

        <main className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 items-center py-16 md:py-24">
          <section>
            <span className="inline-flex px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-sm">
              Interweek • UU MLC
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mt-6 leading-[0.95]">
              Learn. Build. <span className="text-yellow-400">Lead.</span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl mt-6 max-w-2xl leading-relaxed">
              UU MLC Nexus is the club workspace for members, projects, points,
              tasks, news, and collaboration — all in one place.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <button
                onClick={onJoin}
                className="px-6 py-3 rounded-2xl bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition"
              >
                Join the Club
              </button>
              <button
                onClick={onLogin}
                className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 font-semibold hover:bg-white/10 transition"
              >
                Member Login
              </button>
            </div>
          </section>

          <section className="bg-white/[0.05] border border-white/10 rounded-[2rem] p-7 shadow-2xl backdrop-blur-xl">
            <img
              src={logo}
              alt="UU MLC logo"
              className="w-32 h-32 object-contain mx-auto"
            />
            <div className="grid grid-cols-2 gap-3 mt-7">
              {[
                ["🏆", "Points"],
                ["👥", "Community"],
                ["✓", "Tasks"],
                ["📰", "News"],
              ].map(([icon, label]) => (
                <div
                  key={label}
                  className="rounded-2xl bg-black/20 border border-white/5 p-5"
                >
                  <div className="text-2xl">{icon}</div>
                  <p className="font-semibold mt-2">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}


export default LandingPage;
