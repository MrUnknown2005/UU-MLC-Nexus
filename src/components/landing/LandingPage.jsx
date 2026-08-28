import logo from "../../assets/club-logo.png";

const modules = [
  { code: "01", name: "Members", detail: "People, roles, presence" },
  { code: "02", name: "Points", detail: "Recognition, ranking, momentum" },
  { code: "03", name: "Workspace", detail: "Tasks, news, club activity" },
];

function LandingPage({ onLogin, onJoin }) {
  return (
    <div className="nexus-v2-landing min-h-screen text-white overflow-hidden relative">
      <div className="nexus-v2-noise" aria-hidden="true" />
      <div className="max-w-[1480px] mx-auto px-5 sm:px-8 py-6 sm:py-8 relative z-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="UU MLC logo" className="w-11 h-11 rounded-xl object-cover nexus-v2-logo" />
            <div>
              <p className="text-[10px] uppercase tracking-[.22em] text-yellow-300/70">Uttara University</p>
              <p className="text-sm font-black tracking-[-.02em]">Machine Learning Club</p>
            </div>
          </div>
          <button type="button" onClick={onLogin} className="nexus-v2-link-button">Member sign in <span>↗</span></button>
        </header>

        <main className="grid lg:grid-cols-[1.08fr_.92fr] gap-12 lg:gap-20 items-center min-h-[calc(100vh-150px)] py-16 lg:py-20">
          <section>
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[.22em] font-extrabold text-yellow-300 border border-yellow-300/20 bg-yellow-300/[.06] rounded-full px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(120,224,143,.8)]" />
              Nexus is live
            </div>
            <h1 className="mt-7 text-[clamp(3.4rem,8vw,7.8rem)] leading-[.88] font-black tracking-[-.075em] max-w-5xl">
              The club,<br /><span className="nexus-v2-gold-text">in motion.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base sm:text-lg leading-8 text-white/55">
              Nexus is the operating layer for UU MLC — a focused place where people, contribution, work and momentum meet.
            </p>
            <div className="flex flex-wrap gap-3 mt-9">
              <button type="button" onClick={onJoin} className="nexus-v2-primary">Enter Nexus <span>→</span></button>
              <button type="button" onClick={onLogin} className="nexus-v2-secondary">I already have an account</button>
            </div>
            <div className="grid sm:grid-cols-3 gap-px bg-white/[.08] border border-white/[.08] rounded-2xl overflow-hidden mt-14 max-w-2xl">
              {modules.map((item) => (
                <div key={item.code} className="bg-[#10120e] p-5 group hover:bg-[#171a13] transition-colors">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-[.18em] text-white/30"><span>{item.code}</span><span className="text-yellow-300/60">N</span></div>
                  <p className="mt-7 font-black text-lg tracking-[-.02em] group-hover:text-yellow-200 transition-colors">{item.name}</p>
                  <p className="text-xs text-white/35 mt-1 leading-5">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative min-h-[500px] flex items-center justify-center">
            <div className="nexus-v2-orbit orbit-a" aria-hidden="true" />
            <div className="nexus-v2-orbit orbit-b" aria-hidden="true" />
            <div className="nexus-v2-orbit orbit-c" aria-hidden="true" />
            <div className="nexus-v2-core">
              <div className="nexus-v2-core-ring" />
              <img src={logo} alt="UU MLC" className="w-24 h-24 sm:w-32 sm:h-32 rounded-[28px] object-cover relative z-10 shadow-2xl" />
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
                <p className="text-[10px] uppercase tracking-[.28em] text-white/30">UU MLC / NEXUS</p>
                <p className="text-sm font-bold text-white/75 mt-2">Community operating system</p>
              </div>
            </div>
            <div className="absolute top-16 right-3 sm:right-10 nexus-v2-float-card"><span className="text-emerald-300">●</span> Live activity</div>
            <div className="absolute bottom-16 left-0 sm:left-4 nexus-v2-float-card"><span className="text-yellow-300">✦</span> Contribution matters</div>
          </section>
        </main>

        <footer className="border-t border-white/[.08] pt-5 flex flex-col sm:flex-row justify-between gap-2 text-[10px] uppercase tracking-[.16em] text-white/25">
          <span>Uttara University · Machine Learning Club</span>
          <span>Learn · Build · Lead</span>
        </footer>
      </div>
    </div>
  );
}

export default LandingPage;
