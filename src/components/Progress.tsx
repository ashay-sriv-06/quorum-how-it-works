import { useAfterMount } from "../lib/motion";
import { pad2 } from "../lib/format";

/** Equal segments; exactly `filled` of them lit. Fills animate only on real changes. */
export function Segments({
  total,
  filled,
  size = "md",
  className = "",
  label,
}: {
  total: number;
  filled: number;
  size?: "md" | "lg";
  className?: string;
  label?: string;
}) {
  const animate = useAfterMount();
  return (
    <div
      className={`segments ${size === "lg" ? "segments-lg" : ""} ${className}`}
      data-animate={animate}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={filled}
      aria-label={label ?? `${filled} of ${total} committed`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="segment" data-on={i < filled}>
          <i />
        </span>
      ))}
    </div>
  );
}

/** Odometer-style number: each digit column rolls to its value. */
export function Rolling({ value, digits = 2, className = "" }: { value: number; digits?: number; className?: string }) {
  const animate = useAfterMount();
  const text = digits === 2 ? pad2(value) : String(value).padStart(digits, "0");
  return (
    <span className={`roll tnum ${className}`} data-animate={animate} aria-label={String(value)} role="text">
      {text.split("").map((ch, i) => (
        <span key={i} className="roll-col" style={{ ["--d" as string]: Number(ch) }} aria-hidden="true">
          {Array.from({ length: 10 }, (_, n) => (
            <span key={n}>{n}</span>
          ))}
        </span>
      ))}
    </span>
  );
}
