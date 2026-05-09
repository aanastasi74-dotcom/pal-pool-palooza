import { useEffect, useRef, useState } from "react";

export function CountUp({ value, duration = 800, prefix = "", format }: { value: number; duration?: number; prefix?: string; format?: (n: number) => string }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const formatted = format ? format(display) : Math.round(display).toLocaleString("pt-BR");
  return <span>{prefix}{formatted}</span>;
}
