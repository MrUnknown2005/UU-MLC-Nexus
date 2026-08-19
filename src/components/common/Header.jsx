import logo from '../../assets/club-logo.png';

function Header({ profile, onLogout }) {
  return (
    <header className="border-b border-white/10 bg-white/[0.03]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="UU MLC Logo"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-yellow-400/20 shrink-0"
          />

          <div className="min-w-0">
            <h1 className="font-bold text-sm sm:text-base truncate">
              UU MLC Nexus
            </h1>

            <p className="hidden sm:block text-gray-500 text-xs truncate">
              Uttara University Machine Learning Club
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-xl border border-white/10"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}


export default Header;
