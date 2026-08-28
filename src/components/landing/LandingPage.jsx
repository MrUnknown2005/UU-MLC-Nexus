import logo from "../../assets/club-logo.png";

const highlights = [
  { label: "Members", value: "Community", icon: "01" },
  { label: "Points", value: "Recognition", icon: "02" },
  { label: "Tasks", value: "Momentum", icon: "03" },
];

const workspaceItems = [
  { label: "Member directory", description: "Find and connect with the club community.", icon: "01" },
  { label: "Points & ranking", description: "Make contributions visible and meaningful.", icon: "02" },
  { label: "Tasks & activity", description: "Keep work organized and momentum clear.", icon: "03" },
  { label: "News & updates", description: "Stay current with what matters to MLC.", icon: "04" },
];

function LandingPage({ onLogin, onJoin }) {
  return (
    <div className="nexus-app-bg min-h-screen text-white overflow-hidden relative nexus-landing">
      <div className="nexus-landing__halo" />
      <div className="nexus-landing__ring nexus-landing__ring--one" />
      <div className="nexus-landing__ring nexus-landing__ring--two" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-6 md:py-8 z-10">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="nexus-landing__logo-wrap">
              <img src={logo} alt="UU MLC" className="w-11 h-11 object-contain rounded-xl" />
            </div>
            <div>
              <p className="font-black text-sm tracking-[.08em]">UU MLC</p>
              <p className="nexus-eyebrow text-yellow-300/80 mt-0.5">NEXUS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.025] px-3 py-2 text-[10px] uppercase tracking-[.18em] text-white/45">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 shadow-[0_0_12px_rgba(255,216,74,.9)]" /> Club system online
            </span>
            <button type="button" onClick={onLogin} className="nexus-morphic-button-ghost text-sm px-4 py-2.5">Sign in</button>
          </div>
        </header>

        <main className="grid lg:grid-cols-[1.04fr_.96fr] gap-12 lg:gap-16 items-center py-16 md:py-24 lg:py-28">
          <section className="max-w-3xl">
            <div className="nexus-badge-yellow inline-flex items-center gap-2 px-3.5 py-1.5">
              <span className="nexus-dot-glow" /> Uttara University · Machine Learning Club
            </div>

            <h1 className="nexus-title text-5xl sm:text-6xl md:text-7xl lg:text-[6.2rem] font-black mt-7">
              The club,
              <span className="block nexus-text-aurora">in motion.</span>
            </h1>

            <p className="nexus-muted text-base sm:text-lg md:text-xl mt-7 max-w-2xl leading-8">
              Nexus turns the MLC community into a living workspace for people, points, projects, tasks, news, and the momentum between them.
            </p>

            <div className="flex flex-wrap gap-3 mt-9">
              <button type="button" onClick={onJoin} className="nexus-morphic-button px-6 py-3.5">Enter Nexus <span aria-hidden="true">→</span></button>
              <button type="button" onClick={onLogin} className="nexus-morphic-button-ghost px-6 py-3.5">Member login</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-12 max-w-2xl">
              {highlights.map((item) => (
                <div key={item.label} className="nexus-glass nexus-landing__metric p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3"><span className="nexus-eyebrow">{item.label}</span><span className="text-xs font-bold text-yellow-300/35">{item.icon}</span></div>
                  <p className="font-bold mt-3 text-white/90">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="nexus-landing__portal">
            <div className="nexus-landing__portal-top">
              <div>
                <span className="nexus-eyebrow text-yellow-300/75">Nexus control plane</span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-2">Everything connected.</h2>
              </div>
              <div className="nexus-landing__status">LIVE</div>
            </div>

            <div className="nexus-landing__radar">
              <div className="nexus-landing__radar-core"><img src={logo} alt="" /></div>
              <span className="nexus-landing__orbit nexus-landing__orbit--a" />
              <span className="nexus-landing__orbit nexus-landing__orbit--b" />
              <span className="nexus-landing__orbit nexus-landing__orbit--c" />
              <span className="nexus-landing__pulse" />
              <span className="nexus-landing__node nexus-landing__node--a">MEMBERS</span>
              <span className="nexus-landing__node nexus-landing__node--b">POINTS</span>
              <span className="nexus-landing__node nexus-landing__node--c">TASKS</span>
            </div>

            <div className="nexus-divider my-5" />
            <div className="space-y-2">
              {workspaceItems.map((item) => (
                <div key={item.label} className="nexus-glass-flat nexus-landing__feature p-4 flex items-start gap-4">
                  <span className="nexus-landing__feature-index">{item.icon}</span>
                  <div className="min-w-0"><p className="font-semibold text-sm">{item.label}</p><p className="text-xs text-white/45 mt-1 leading-5">{item.description}</p></div>
                  <span className="ml-auto text-yellow-300/35 text-sm">↗</span>
                </div>
              ))}
            </div>

            <div className="nexus-landing__ticker mt-5"><span>UU MLC</span><i /> <span>LEARN</span><i /> <span>BUILD</span><i /> <span>LEAD</span><i /> <span>NEXUS</span></div>
          </section>
        </main>

        <footer className="pt-6 border-t border-white/[.07] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/35">
          <p>© {new Date().getFullYear()} Uttara University MLC</p>
          <p>Machine Learning · Community · Innovation</p>
        </footer>
      </div>
    </div>
  );
}

export default LandingPage;
