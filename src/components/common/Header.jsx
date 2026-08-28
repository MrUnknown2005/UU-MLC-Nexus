import logo from "../../assets/club-logo.png";

function Header({ profile, onLogout }) {
  return (
    <header className="nexus-header sticky top-0 z-40">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0 nexus-brand-mark">
            <div className="absolute -inset-2 rounded-2xl bg-yellow-400/10 blur-xl" />
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl p-[2px] bg-gradient-to-br from-yellow-100 via-yellow-400 to-amber-700 shadow-[0_0_30px_rgba(255,190,0,.16)]">
              <div className="w-full h-full rounded-[14px] bg-[#090909] p-1 overflow-hidden">
                <img src={logo} alt="UU MLC Logo" className="w-full h-full object-contain rounded-xl" />
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-black text-[15px] sm:text-base tracking-tight truncate">
                <span className="nexus-text-aurora">UU MLC</span> <span className="text-white">NEXUS</span>
              </h1>
              <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-yellow-400/15 bg-yellow-400/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.18em] text-yellow-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 shadow-[0_0_10px_rgba(255,216,74,.9)]" /> Live
              </span>
            </div>
            <p className="hidden sm:block text-[11px] text-stone-500 mt-0.5 truncate tracking-wide">Uttara University Machine Learning Club</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {profile && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/8 bg-white/[.025] px-3 py-2">
              <span className="text-[9px] uppercase tracking-[.2em] text-stone-500">Balance</span>
              <span className="font-black text-sm text-yellow-200">{profile.points ?? 0}</span>
              <span className="text-[10px] text-stone-500">PTS</span>
            </div>
          )}
          <button onClick={onLogout} className="nexus-glass-button nexus-glass-button-danger px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold">
            <span className="hidden sm:inline">Sign Out</span><span className="sm:hidden">Exit</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
