import type { CSSProperties } from "react";
import { Link } from "react-router";
import type { GatheringEvent } from "../../shared/types";
import { money, progressOf, relativeWhen } from "../lib/format";
import { Scene } from "../scene/Scene";
import { Icon } from "./Icon";
import { AvatarStack } from "./People";
import { Segments } from "./Progress";

export function statusBadge(e: GatheringEvent) {
  const { remaining } = progressOf(e);
  if (e.status === "confirmed") return { text: "Confirmed", solid: true };
  if (e.status === "expired") return { text: "Closed", solid: false };
  if (remaining === 1) return { text: "One seat away", solid: false };
  return { text: `${remaining} seats to go`, solid: false };
}

function Meta({ e, className = "" }: { e: GatheringEvent; className?: string }) {
  return (
    <p className={`meta text-muted flex flex-wrap gap-x-3 gap-y-1 ${className}`}>
      <span className="text-text/90">{e.priceCents ? `${money(e.priceCents)} / seat` : "Free"}</span>
      <span aria-hidden="true">·</span>
      <span>{e.location}</span>
      <span aria-hidden="true" className="max-xs:hidden">·</span>
      <span className="max-xs:w-full">{relativeWhen(e)}</span>
    </p>
  );
}

export function EventCard({
  event: e,
  variant = "tile",
  className = "",
  style,
}: {
  event: GatheringEvent;
  variant?: "feature" | "tile";
  className?: string;
  style?: CSSProperties;
}) {
  const { count, total } = progressOf(e);
  const badge = statusBadge(e);
  const feature = variant === "feature";
  const plate = e.scene === "seat" && feature ? "seat-close" : e.scene;

  return (
    <Link
      to={`/g/${e.slug}`}
      className={`card group relative isolate flex flex-col justify-end overflow-hidden border border-line bg-panel focus-inset ${
        feature ? "min-h-[480px] md:min-h-[600px]" : "min-h-[320px] md:min-h-[340px]"
      } ${className}`}
      style={style}
      aria-label={`${e.title} — ${count} of ${total} committed. View gathering`}
    >
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Scene
          plate={plate}
          className="card-photo absolute inset-0"
          focus={feature ? [1, 0.45] : [0.5, 0.35]}
          trace={feature && e.status === "collecting"}
          seat={e.status === "confirmed" ? "taken" : "open"}
          fade={{ bottom: feature ? "50%" : "92%" }}
          brightness={feature ? 1.05 : 0.72}
          enter={false}
        />
      </div>

      <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3">
        <span className={`chip ${badge.solid ? "chip-solid" : ""}`}>
          {!badge.solid && <span className="dot" />}
          {badge.text}
        </span>
        {e.isDemoFixture && <span className="chip text-dim !text-[10.5px]">Demo</span>}
      </div>

      <div className={feature ? "p-6 md:p-8" : "p-5 md:p-6"}>
        <h3 className={`title text-text ${feature ? "text-[34px] md:text-[52px]" : "text-[28px] md:text-[32px]"}`}>{e.title}</h3>
        <Meta e={e} className={feature ? "mt-4" : "mt-3"} />
        <div className={`flex flex-wrap items-end justify-between gap-x-5 gap-y-4 ${feature ? "mt-8" : "mt-6"}`}>
          <div className="min-w-0 flex-1 basis-[220px] max-w-[300px]">
            <div className="flex items-center gap-3">
              <AvatarStack people={e.participants} size={feature ? 40 : 32} max={feature ? 4 : 3} />
              <span className={`text-muted whitespace-nowrap ${feature ? "text-[18px]" : "text-[15.5px]"}`}>
                <span className="text-text/90">{count}</span> of {total} committed
              </span>
            </div>
            <Segments total={total} filled={Math.min(count, total)} className="mt-4" />
          </div>
          {feature ? (
            <span className="btn btn-primary max-sm:hidden shrink-0">
              View gathering <Icon name="arrowUpRight" size={16} className="arrow arrow-ur" />
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center gap-2 text-[15.5px] text-text min-h-11">
              View gathering
              <Icon name="arrowUpRight" size={16} className="transition-all duration-250 group-hover:translate-x-[3px] group-hover:-translate-y-[3px] group-hover:text-cobalt-hi" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
