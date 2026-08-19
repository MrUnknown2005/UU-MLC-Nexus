function Stat({ title, value }) {
  return (
    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
      <p className="text-gray-500 text-sm">{title}</p>

      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}


export default Stat;
