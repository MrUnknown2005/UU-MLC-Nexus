function Stat({ title, value, tone = "yellow", icon }) {
  const toneClass = `nexus-stat-stat-${tone}`;

  return (
    <div className={`nexus-stat ${toneClass}`}>
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">
            {title}
          </p>

          <p className="text-3xl font-black mt-2 bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">
            {value}
          </p>
        </div>

        {icon && (
          <span className="text-2xl opacity-80 grayscale-0">{icon}</span>
        )}
      </div>
    </div>
  );
}


export default Stat;
