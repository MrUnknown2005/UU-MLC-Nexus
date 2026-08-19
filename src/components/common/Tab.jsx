function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition backdrop-blur-md ${
        active
          ? "bg-gradient-aurora bg-[length:200%_200%] text-black shadow-[0_8px_22px_rgba(139,92,246,0.30)] animate-grad-pan"
          : "bg-white/[0.05] text-gray-300 border border-white/10 hover:bg-white/[0.10] hover:border-yellow-400/30"
      }`}
    >
      {children}
    </button>
  );
}


export default Tab;
