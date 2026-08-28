import logo from '../../assets/club-logo.png';

function Header({ profile, onLogout }) {
  const displayName = profile?.full_name || profile?.name || profile?.email?.split('@')[0] || 'Member';
  const roleLabel = profile?.role ? profile.role.replaceAll('_', ' ') : 'Member';

  return (
    <header className="nexus-header sticky top-0 z-40">
      <div className="max-w-[1480px] mx-auto px-4 sm:px-7 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <img src={logo} alt="UU MLC logo" className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover nexus-avatar-ring-yellow" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black tracking-[-.04em] text-base sm:text-lg text-white">NEXUS</span>
              <span className="hidden sm:inline text-[9px] uppercase tracking-[.18em] text-yellow-300/70 border border-yellow-300/20 rounded-full px-2 py-0.5">UU MLC</span>
            </div>
            <p className="hidden sm:block text-[11px] text-white/38 truncate">Machine Learning Club · Command Center</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {profile && (
            <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-xl border border-white/10 bg-white/[.025]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(120,224,143,.65)]" />
              <div className="leading-none">
                <p className="text-xs font-bold text-white/85">{displayName}</p>
                <p className="text-[10px] text-white/35 mt-1 capitalize">{roleLabel} · {profile.points ?? 0} pts</p>
              </div>
            </div>
          )}
          <button onClick={onLogout} className="nexus-glass-button nexus-glass-button-danger px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
