function NavItem({ active, onClick, icon, children, badge = 0 }) {
  return (
    <button
      onClick={onClick}
      className={`nexus-tab ${active ? "is-active" : ""}`}
    >
      <span className="flex items-center gap-3">
        <span className="w-6 text-center text-base">{icon}</span>
        {children}
      </span>
      {badge > 0 && (
        <span className="nexus-tab-badge">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}


export default NavItem;
