import { useEffect, useRef } from "react";

export default function NexusAtmosphere() {
  const layerRef = useRef(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return undefined;

    let frame = 0;
    const handlePointer = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = event.clientX / window.innerWidth;
        const y = event.clientY / window.innerHeight;
        layer.style.setProperty("--mx", `${x * 100}%`);
        layer.style.setProperty("--my", `${y * 100}%`);
        layer.style.setProperty("--px", `${(x - 0.5) * 18}px`);
        layer.style.setProperty("--py", `${(y - 0.5) * 18}px`);
      });
    };

    window.addEventListener("pointermove", handlePointer, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handlePointer);
    };
  }, []);

  return (
    <div ref={layerRef} className="nexus-atmosphere" aria-hidden="true">
      <div className="nexus-atmosphere__grid" />
      <div className="nexus-atmosphere__orb nexus-atmosphere__orb--gold" />
      <div className="nexus-atmosphere__orb nexus-atmosphere__orb--violet" />
      <div className="nexus-atmosphere__orb nexus-atmosphere__orb--blue" />
      <div className="nexus-atmosphere__noise" />
      <div className="nexus-atmosphere__scanline" />
    </div>
  );
}
