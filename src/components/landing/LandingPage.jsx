import logo from "../../assets/club-logo.png";

const highlights = [
  { label: "Members", value: "Community", icon: "01", tone: "purple" },
  { label: "Points", value: "Recognition", icon: "02", tone: "yellow" },
  { label: "Tasks", value: "Progress", icon: "03", tone: "cyan" },
];

const workspaceItems = [
  { label: "Member directory", description: "Find and connect with the club community.", icon: "01" },
  { label: "Points & ranking", description: "Make contributions visible and meaningful.", icon: "02" },
  { label: "Tasks & activity", description: "Keep work organized and momentum clear.", icon: "03" },
  { label: "News & updates", description: "Stay current with what matters to MLC.", icon: "04" },
];

function LandingPage({ onLogin, onJoin }) {
  return (
    <div className="nexus-app-bg min-h-screen text-white overflow-hidden relative">
      <div className="nexus-glow-yellow w-[24rem] h-[24rem] -top-32 -left-32" />
      <div className="nexus-glow-purple w-[26rem] h-[26rem] top-1/3 -right-48" />
      <div className="nexus-glow-cyan w-[20rem] h-[20rem] bottom-0 left-1/3" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-7 md:py-10 z-10">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="UU MLC"
              className="w-11 h-11 object-contain rounded-xl nexus-image-frame"
            />
            <div>
              <p className="font-black text-sm tracking-tight">UU MLC</p>
              <p className="nexus-eyebrow text-yellow-300/80 mt-0.5">Nexus</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogin}
            className="nexus-morphic-button-ghost text-sm"
          >
            Sign in
          </button>
        </header>

        <main className="grid lg:grid-cols-[1.08fr_0.92fr] gap-12 lg:gap-16 items-center py-16 md:py-24 lg:py-28">
          <section className="max-w-3xl">
            <div className="nexus-badge-yellow inline-flex items-center gap-2 px-3.5 py-1.5">
              <span className="nexus-dot-glow" />
              Uttara University · Machine Learning Club
            </div>

            <h1 className="nexus-title text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-black mt-7">
              One place to
              <span className="block nexus-text-aurora">learn, build, lead.</span>
            </h1>

            <p className="nexus-muted text-base sm:text-lg md:text-xl mt-7 max-w-2xl leading-8">
              Nexus brings the MLC community, projects, points, tasks, news, and
              member activity into one focused workspace built for getting things done.
            </p>

            <div className="flex flex-wrap gap-3 mt-9">
              <button
                type="button"
                onClick={onJoin}
                className="nexus-morphic-button px-6 py-3.5"
              >
                Join the club <span aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                onClick={onLogin}
                className="nexus-morphic-button-ghost px-6 py-3.5"
              >
                Member login
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-12 max-w-2xl">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className={`nexus-glass nexus-glass-${item.tone} p-4 sm:p-5`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="nexus-eyebrow">{item.label}</span>
                    <span className="text-xs font-bold text-white/35">{item.icon}</span>
                  </div>
                  <p className="font-bold mt-3">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="nexus-glass-strong p-5 sm:p-7 lg:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <span className="nexus-eyebrow text-yellow-300/75">Inside Nexus</span>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-2">
                  Your club workspace.
                </h2>
              </div>
              <div className="w-11 h-11 rounded-xl nexus-glass-flat flex items-center justify-center shrink-0">
                <img src={logo} alt="" className="w-7 h-7 object-contain" />
              </div>
            </div>

            <div className="nexus-divider my-6" />

            <div className="space-y-2">
              {workspaceItems.map((item) => (
                <div
                  key={item.label}
                  className="nexus-glass-flat p-4 flex items-start gap-4 transition-transform hover:-translate-y-0.5"
                >
                  <span className="w-9 h-9 rounded-lg bg-white/[0.045] border border-white/10 flex items-center justify-center text-xs font-bold text-yellow-300/80 shrink-0">
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-white/50 mt-1 leading-5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-yellow-300/10 bg-yellow-300/[0.035] p-4">
              <p className="nexus-eyebrow text-yellow-200/70">Built for momentum</p>
              <p className="text-sm text-white/65 mt-2 leading-6">
                Clear ownership, visible progress, and a shared place for the work that moves the club forward.
              </p>
            </div>
          </section>
        </main>

        <footer className="pt-6 border-t border-white/[0.07] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/35">
          <p>© {new Date().getFullYear()} Uttara University MLC</p>
          <p>Machine Learning · Community · Innovation</p>
        </footer>
      </div>
    </div>
  );
}

export default LandingPage;
