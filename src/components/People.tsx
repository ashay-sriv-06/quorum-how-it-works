import type { Participant } from "../../shared/types";
import { initials } from "../lib/format";

const PHOTOS: Record<string, string> = {
  "maya chen": "/scenes/avatar-maya.webp",
  "jordan lee": "/scenes/avatar-jordan.webp",
  "alex rivera": "/scenes/avatar-alex.webp",
};

export function Avatar({
  name,
  size = 40,
  photo = true,
  className = "",
}: {
  name: string;
  size?: number;
  photo?: boolean;
  className?: string;
}) {
  const src = photo ? PHOTOS[name.trim().toLowerCase()] : undefined;
  return (
    <span
      className={`relative inline-grid place-items-center shrink-0 rounded-full overflow-hidden border border-[#3a4650] text-text ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      title={name}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover grayscale contrast-110" />
      ) : (
        <span className="font-mono tracking-[0.02em] leading-none bg-[#141d24] h-full w-full grid place-items-center">
          {initials(name)}
        </span>
      )}
    </span>
  );
}

export function AvatarStack({ people, max = 4, size = 34 }: { people: Participant[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  const overlap = -Math.round(size * 0.28);
  return (
    <span className="flex items-center" aria-hidden="true">
      {shown.map((p, i) => (
        <span key={p.id} className="rounded-full ring-2 ring-ink" style={{ marginLeft: i === 0 ? 0 : overlap }}>
          <Avatar name={p.name} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="grid place-items-center rounded-full bg-panel-2 border border-line font-mono text-[11px] text-muted ring-2 ring-ink"
          style={{ width: size, height: size, marginLeft: overlap }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
