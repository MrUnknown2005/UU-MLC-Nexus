function NavItem({ active, onClick, icon, children, badge = 0 }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-3.5 sm:py-3 rounded-xl sm:rounded-2xl text-left text-sm sm:text-base transition ${active ? "bg-yellow-400 text-black" : "text-gray-300 hover:bg-white/10"}`}
    >
      <span className="flex items-center gap-3">
        <span className="w-6 text-center">{icon}</span>
        {children}
      </span>
      {badge > 0 && (
        <span
          className={`min-w-6 h-6 px-2 rounded-full text-xs flex items-center justify-center font-bold ${active ? "bg-black text-yellow-300" : "bg-red-500 text-white"}`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}


export default NavItem;
