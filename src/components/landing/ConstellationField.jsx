import { useEffect, useRef } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";

/**
 * Ambient constellation for the landing's decoration panel.
 *
 * This is the tasteful, single-accent descendant of the "neural network"
 * canvas backgrounds that float around club sites: drifting nodes, hairline
 * links between near neighbours, and a gentle pull toward the cursor. It is
 * deliberately small and quiet — it lives *behind* the brand mark inside the
 * one square on this page that is allowed to be decorative, and it renders in
 * a single amber (read live from `--brand`, so it follows the theme).
 *
 * It earns its keep by never being wasteful:
 *   - nothing runs under `prefers-reduced-motion` — we paint one static frame;
 *   - the loop pauses when the panel scrolls out of view or the tab is hidden;
 *   - the device pixel ratio is capped at 2 so a 4K display doesn't melt;
 *   - every observer, listener and frame is torn down on unmount.
 *
 * No library, no dependency — just canvas and requestAnimationFrame.
 */
export function ConstellationField({ className }) {
  const canvasRef = useRef(null);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let nodes = [];
    let frame = 0;
    let visible = true;
    const pointer = { x: -999, y: -999 };

    // Amber, read from the active theme. Refreshed when the theme flips so the
    // field stays the right amber on warm-paper light mode too.
    let rgb = "242, 168, 28";
    const readBrand = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--brand")
        .trim();
      const parsed = hexToRgb(raw);
      if (parsed) rgb = parsed;
    };

    const seed = () => {
      // Node count tracks the panel's area, then clamped so it never looks
      // sparse on a small square or noisy on a large one.
      const target = Math.round((width * height) / 10000);
      const count = Math.max(16, Math.min(30, target));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.24,
        vy: (Math.random() - 0.5) * 0.24,
        r: Math.random() * 1.3 + 0.9,
      }));
    };

    const size = () => {
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (width === 0 || height === 0) return; // panel is display:none (mobile)
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const maxDist = () => Math.min(width * 0.34, 170);

    const drawFrame = () => {
      if (width === 0 || height === 0) return;
      ctx.clearRect(0, 0, width, height);
      const link = maxDist();

      for (const p of nodes) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d < 120 && d > 0.5) {
          p.x += (dx / d) * 0.35;
          p.y += (dy / d) * 0.35;
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) {
            ctx.strokeStyle = `rgba(${rgb}, ${(1 - d / link) * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of nodes) {
        ctx.fillStyle = `rgba(${rgb}, 0.55)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = () => {
      drawFrame();
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      if (frame || reduceMotion || !visible) return;
      frame = requestAnimationFrame(loop);
    };

    const stop = () => {
      if (!frame) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    // ---- wire up ----
    readBrand();
    size();

    if (reduceMotion) {
      // One honest static frame — the shape without the movement.
      drawFrame();
    } else {
      start();
    }

    const onPointerMove = (e) => {
      const rect = parent.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointer.x = -999;
      pointer.y = -999;
    };
    if (!reduceMotion) {
      parent.addEventListener("pointermove", onPointerMove);
      parent.addEventListener("pointerleave", onPointerLeave);
    }

    const ro = new ResizeObserver(() => {
      size();
      if (reduceMotion) drawFrame();
    });
    ro.observe(parent);

    // Pause when the panel isn't on screen — no point animating pixels nobody
    // is looking at.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (reduceMotion) return;
        if (visible) start();
        else stop();
      },
      { threshold: 0.01 }
    );
    io.observe(parent);

    const onVisibility = () => {
      if (reduceMotion) return;
      if (document.hidden) stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const themeObserver = new MutationObserver(() => {
      readBrand();
      if (reduceMotion) drawFrame();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      parent.removeEventListener("pointermove", onPointerMove);
      parent.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
    />
  );
}

/** "#f2a81c" | "#fff" -> "242, 168, 28". Returns null on anything unexpected. */
function hexToRgb(hex) {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length !== 6) return null;
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export default ConstellationField;
