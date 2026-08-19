function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm transition ${
        active
          ? "bg-yellow-400 text-black"
          : "bg-white/[0.05] text-gray-300 border border-white/10 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}


export default Tab;
