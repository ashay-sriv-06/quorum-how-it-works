import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { SceneKey } from "../../shared/types";
import { prefersReducedMotion } from "../lib/motion";
import { PLATES } from "./plates";

export interface SceneMarker {
  /** anchor in plate pixels */
  at: [number, number];
  label?: ReactNode;
  /** leader line to label, in screen px (label sits at the line's end) */
  lead?: [number, number];
  boxed?: boolean;
  ripple?: boolean;
  /** hide the label (not the node) below md */
  hideLabelOnMobile?: boolean;
  delay?: number;
  key?: string;
}

interface Fade {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
}

interface SceneProps {
  plate: SceneKey;
  className?: string;
  style?: CSSProperties;
  /** focal point used when cropping to cover (0..1) */
  focus?: [number, number];
  /** trace the empty chair once on mount */
  trace?: boolean;
  /** seat state: "open" shows the traced chair, "taken" dims it slightly, "none" hides it */
  seat?: "open" | "taken" | "none";
  markers?: SceneMarker[];
  fade?: Fade;
  parallax?: boolean;
  /** halftone veil + plate fade on first arrival */
  enter?: boolean;
  alt?: string;
  brightness?: number;
  priority?: boolean;
  /** SVG content drawn in plate pixel space (moves and crops with the photo) */
  overlay?: ReactNode;
  children?: ReactNode;
}

const fadeGradient: Record<keyof Fade, string> = {
  left: "to right",
  right: "to left",
  top: "to bottom",
  bottom: "to top",
};

export function Scene({
  plate: key,
  className = "",
  style,
  focus = [0.5, 0.5],
  trace = false,
  seat = "open",
  markers = [],
  fade,
  parallax = false,
  enter = true,
  alt = "",
  brightness = 1,
  priority = false,
  overlay,
  children,
}: SceneProps) {
  const plate = PLATES[key];
  const rootRef = useRef<HTMLDivElement>(null);
  const maskId = useId().replace(/:/g, "");
  const [traceState] = useState<"run" | "done">(() => (trace && !prefersReducedMotion() ? "run" : "done"));

  // Restrained pointer parallax on the decorative plate only (desktop, fine pointer).
  useEffect(() => {
    const el = rootRef.current;
    if (!parallax || !el) return;
    const fine = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    if (!fine.matches || prefersReducedMotion()) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;
        el.style.setProperty("--px", `${(-x * 6).toFixed(2)}px`);
        el.style.setProperty("--py", `${(-y * 6).toFixed(2)}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [parallax]);

  const fades = fade
    ? (Object.keys(fade) as (keyof Fade)[]).map((side) => (
        <div
          key={side}
          className="scene-fade"
          style={{
            background: `linear-gradient(${fadeGradient[side]}, var(--color-ink) 0%, rgb(8 13 16 / 0.72) calc(${fade[side]} * 0.45), transparent ${fade[side]})`,
          }}
        />
      ))
    : null;

  const showSeat = plate.seat && seat !== "none";

  return (
    <div
      ref={rootRef}
      className={`scene ${className}`}
      data-enter={enter}
      data-trace={traceState}
      data-seat={seat}
      style={
        {
          ...style,
          "--ar": plate.width / plate.height,
          "--fx": focus[0],
          "--fy": focus[1],
          "--plate-scale": parallax ? 1.012 : 1,
          "--plate-brightness": brightness,
        } as CSSProperties
      }
    >
      <div className="scene-frame">
        <div className="scene-plate">
          <img
            src={plate.src}
            alt={alt}
            width={plate.width}
            height={plate.height}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            draggable={false}
          />
          {showSeat && (
            <svg viewBox={`0 0 ${plate.width} ${plate.height}`} preserveAspectRatio="none" aria-hidden="true" className="seat-layer">
              <defs>
                <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={plate.width} height={plate.height}>
                  {plate.seat!.paths.map((d, i) => (
                    <path
                      key={i}
                      d={d}
                      pathLength={1}
                      className="trace-path"
                      fill="none"
                      stroke="#fff"
                      strokeWidth={30}
                      strokeLinejoin="round"
                    />
                  ))}
                </mask>
              </defs>
              <image href={plate.seat!.src} width={plate.width} height={plate.height} mask={`url(#${maskId})`} className="seat-glow" />
              <image href={plate.seat!.src} width={plate.width} height={plate.height} mask={`url(#${maskId})`} />
            </svg>
          )}
          {overlay && (
            <svg viewBox={`0 0 ${plate.width} ${plate.height}`} aria-hidden="true" className="pointer-events-none z-[3]">
              {overlay}
            </svg>
          )}
          {markers.map((m, i) => (
            <Marker key={m.key ?? i} marker={m} plateW={plate.width} plateH={plate.height} />
          ))}
        </div>
      </div>
      {fades}
      <div className="scene-veil" aria-hidden="true" />
      {children}
    </div>
  );
}

function Marker({ marker, plateW, plateH }: { marker: SceneMarker; plateW: number; plateH: number }) {
  const [lx, ly] = marker.lead ?? [0, 0];
  const hasLead = marker.lead && (lx !== 0 || ly !== 0);
  return (
    <div
      className="marker"
      data-ripple={marker.ripple ?? false}
      style={
        {
          left: `${(marker.at[0] / plateW) * 100}%`,
          top: `${(marker.at[1] / plateH) * 100}%`,
          "--marker-delay": `${marker.delay ?? 900}ms`,
        } as CSSProperties
      }
    >
      {hasLead && (
        <svg className={`marker-lead ${marker.hideLabelOnMobile ? "max-md:hidden" : ""}`} width="1" height="1" aria-hidden="true">
          <line x1={0} y1={0} x2={lx} y2={ly} />
          <line x1={lx} y1={ly} x2={lx + (lx >= 0 ? 12 : -12)} y2={ly} />
        </svg>
      )}
      <span className="marker-node" />
      {marker.label && (
        <span
          className={`marker-label ${marker.boxed ? "boxed" : ""} ${marker.hideLabelOnMobile ? "max-md:hidden" : ""}`}
          style={{
            left: lx >= 0 ? lx + 20 : undefined,
            right: lx < 0 ? -lx + 20 : undefined,
            top: ly,
            transform: "translateY(-50%)",
          }}
        >
          {marker.label}
        </span>
      )}
    </div>
  );
}
