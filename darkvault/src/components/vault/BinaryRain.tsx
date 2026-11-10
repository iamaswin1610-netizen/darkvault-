import { useEffect, useRef } from "react";

/** Animated falling binary columns drawn on a canvas. */
export function BinaryRain({
  className,
  density = 18,
  active = true,
}: {
  className?: string;
  density?: number;
  active?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const styles = getComputedStyle(document.documentElement);
    const glow = styles.getPropertyValue("--glow").trim() || "#29c5ff";
    const neon = styles.getPropertyValue("--neon").trim() || "#2f80ff";

    let w = 0;
    let h = 0;
    let cols: { y: number; speed: number; len: number; bright: boolean }[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.ceil(w / density);
      cols = Array.from({ length: n }, () => ({
        y: Math.random() * -h,
        speed: 0.6 + Math.random() * 1.8,
        len: 6 + Math.floor(Math.random() * 14),
        bright: Math.random() > 0.7,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = `600 ${density - 4}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      cols.forEach((c, i) => {
        const x = i * density + density / 2;
        for (let k = 0; k < c.len; k++) {
          const y = c.y - k * density;
          if (y < -density || y > h + density) continue;
          const alpha = k === 0 ? 1 : Math.max(0, 1 - k / c.len) * 0.75;
          ctx.globalAlpha = alpha * (c.bright ? 1 : 0.55);
          ctx.fillStyle = k === 0 ? glow : neon;
          const digit = (Math.floor((c.y + k * 7) / density) + i + k) % 2 === 0 ? "0" : "1";
          ctx.fillText(digit, x, y);
        }
        c.y += c.speed * (reduce ? 0.2 : 1);
        if (c.y - c.len * density > h) {
          c.y = Math.random() * -h * 0.3;
          c.speed = 0.6 + Math.random() * 1.8;
        }
      });
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density, active]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
