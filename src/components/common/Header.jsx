import logo from '../../assets/club-logo.png';

function Header({ profile, onLogout }) {
  return (
    <header className="nexus-header sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-aurora blur-md opacity-60" />
            <img
              src={logo}
              alt="UU MLC Logo"
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover nexus-avatar-ring-yellow shrink-0"
            />
          </div>

          <div className="min-w-0">
            <h1 className="font-black text-sm sm:text-base truncate">
              <span className="nexus-text-aurora">UU MLC</span>{" "}
              <span className="text-white">Nexus</span>
            </h1>

            <p className="hidden sm:block text-gray-500 text-xs truncate">
              Uttara University Machine Learning Club
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile && (
            <span className="hidden sm:inline nexus-badge-yellow">
              {profile.points ?? 0} pts
            </span>
          )}
          <button
            onClick={onLogout}
            className="nexus-glass-button nexus-glass-button-danger"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}


export default Header;
