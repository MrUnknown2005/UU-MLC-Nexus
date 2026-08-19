function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`nexus-tab-pill${active ? " is-active" : ""}`}
    >
      {children}
    </button>
  );
}


export default Tab;
