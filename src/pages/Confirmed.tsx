import { useEffect, type CSSProperties } from "react";
import { useParams } from "react-router";
import { adapter } from "../data/adapter";
import { usePolled } from "../data/usePolled";
import { ButtonLink } from "../components/Button";
import { Icon } from "../components/Icon";
import { Segments } from "../components/Progress";
import { dateLabel, firstName, pad2, progressOf, shortDuration, timeLabel, tzAbbr } from "../lib/format";
import { downloadBlob, eventIcs } from "../lib/files";
import { Scene } from "../scene/Scene";
import { PLATES } from "../scene/plates";
import { NotFound } from "./NotFound";

export function Confirmed() {
  const { slug = "" } = useParams();
  const { data: e, error } = usePolled(`event:${slug}`, () => adapter.getEvent(slug), 5000);

  useEffect(() => {
    if (e) document.title = e.status === "confirmed" ? `It’s happening — ${e.title}` : `${e.title} — Quorum`;
  }, [e?.status, e?.title]);

  if (error?.code === "not_found") return <NotFound what="gathering" />;
  if (!e) return <div className="wrap py-24"><div className="h-[60vh] panel animate-pulse" /></div>;

  const p = progressOf(e);

  if (e.status !== "confirmed") {
    return (
      <div className="wrap py-20 md:py-28 max-w-3xl">
        <p className="eyebrow text-muted">{e.status === "expired" ? "Commitments closed" : "Not yet"}</p>
        <h1 className="display display-lg mt-5">
          {e.status === "expired" ? "This one didn’t happen." : `${numberLeft(p.remaining)} to go.`}
        </h1>
        <p className="mt-6 text-[18px] text-muted">
          {e.title} has {p.count} of {p.total} commitments.{" "}
          {e.status === "expired" ? "Nobody was charged." : "It’s confirmed the moment the last seat fills."}
        </p>
        <Segments total={p.total} filled={p.count} size="lg" className="mt-8 max-w-md" />
        <ButtonLink to={`/g/${e.slug}`} arrow="up-right" className="mt-10">
          {e.status === "expired" ? "View gathering" : "Take a seat"}
        </ButtonLink>
      </div>
    );
  }

  const plate = PLATES["circle-wide"];
  const anchors = [plate.anchors!.a!, plate.anchors!.b!, plate.anchors!.c!];
  const named = e.participants.slice(0, 3);
  const extra = e.participants.length - named.length;
  const pageUrl = `${window.location.origin}${import.meta.env.BASE_URL}g/${e.slug}`;

  return (
    <div className="pb-20">
      <section className="wrap pt-10 md:pt-14 text-center">
        <p className="eyebrow text-cobalt-hi inline-flex items-center gap-3 rise" style={{ ["--i" as string]: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" className="check-draw" data-run="true" aria-hidden="true" style={{ ["--d" as string]: "0ms" }}>
            <path d="m4 12.5 5 5L20 6.5" pathLength={1} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: "250ms" }} />
          </svg>
          Quorum reached
        </p>
        <h1 className="display mt-4 text-[clamp(3rem,1.6rem+6.5vw,7rem)] !leading-[0.95] rise" style={{ ["--i" as string]: 1 }}>
          It’s happening.
        </h1>
        <p className="mt-5 text-[18px] md:text-[22px] font-light text-muted rise" style={{ ["--i" as string]: 2 }}>
          {p.count === 3 ? "Three people" : `${p.count} people`} said yes. Now it’s real.
        </p>
      </section>

      {/* the circle */}
      <section className="relative mt-10 md:mt-12 mx-auto max-w-[1360px] px-[var(--gutter)]">
        <div className="relative">
          <Scene
            plate="circle-wide"
            className="aspect-[1520/660]"
            focus={[0.5, 0.4]}
            fade={{ left: "16%", right: "16%", bottom: "22%", top: "8%" }}
            alt="Three people laughing together around a table with laptops."
            markers={named.map((person, i) => ({
              key: person.id,
              at: anchors[i]!,
              lead: [18, -40] as [number, number],
              label: firstName(person.name),
              boxed: true,
              hideLabelOnMobile: true,
              delay: 300 + i * 140,
            }))}
            overlay={
              <g className="connect">
                {anchors.slice(0, Math.max(0, named.length - 1)).map(([x1, y1], i) => {
                  const [x2, y2] = anchors[i + 1]!;
                  return (
                    <path
                      key={i}
                      d={`M${x1} ${y1 - 70} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 150} ${x2} ${y2 - 70}`}
                      pathLength={1}
                      fill="none"
                      stroke="var(--color-cobalt)"
                      strokeWidth={2.2}
                      style={{ ["--d" as string]: `${750 + i * 180}ms` } as CSSProperties}
                    />
                  );
                })}
              </g>
            }
          >
            <p className="absolute right-4 md:right-[9%] bottom-4 md:bottom-[12%] z-[6] meta text-cobalt-hi !text-[12.5px] seat-occupied" style={{ ["--d" as string]: "900ms" } as CSSProperties}>
              {pad2(p.count)} / {pad2(p.total)} confirmed{extra > 0 ? ` · +${extra}` : ""}
            </p>
          </Scene>
          {/* scattered nodes, a quiet echo of the network */}
          {[
            [2, 18],
            [3, 55],
            [97, 20],
            [97.5, 60],
          ].map(([x, y], i) => (
            <span key={i} className="absolute size-[6px] rounded-full bg-cobalt max-lg:hidden seat-occupied" style={{ left: `${x}%`, top: `${y}%`, ["--d" as string]: `${500 + i * 90}ms` } as CSSProperties} />
          ))}
        </div>
      </section>

      {/* summary */}
      <section className="wrap mt-8 md:-mt-2 relative z-10 max-w-[1300px]">
        <div className="panel-glass grid md:grid-cols-[auto_minmax(0,1.3fr)_repeat(3,auto)] items-center rise" style={{ ["--i" as string]: 3, ["--base" as string]: "300ms" }}>
          <div className="hidden md:block w-[140px] h-[70px] m-3 overflow-hidden border border-line-soft">
            <Scene plate={e.scene} className="w-full h-full" enter={false} seat="none" focus={[0.6, 0.35]} />
          </div>
          <p className="px-5 md:px-6 pt-5 md:pt-0 text-[24px] md:text-[26px] font-light tracking-[-0.02em] leading-tight">{e.title}</p>
          <p className="flex items-center gap-3 px-5 md:px-7 py-2 md:py-6 md:border-l border-line text-[16px] text-muted whitespace-nowrap">
            <Icon name="calendar" size={19} />
            <span className="text-text/90">
              {dateLabel(e.startsAt, e.timezone)} · {timeLabel(e.startsAt, e.timezone)} {tzAbbr(e.startsAt, e.timezone)}
            </span>
          </p>
          <p className="flex items-center gap-3 px-5 md:px-7 py-2 md:py-6 md:border-l border-line text-[16px] text-muted whitespace-nowrap">
            <Icon name={e.location.toLowerCase() === "online" ? "video" : "pin"} size={19} />
            <span className="text-text/90">
              {e.location} · {shortDuration(e.durationMinutes)}
            </span>
          </p>
          <p className="flex items-center gap-3 px-5 md:px-7 pt-2 pb-5 md:py-6 md:border-l border-line text-[16px] text-muted whitespace-nowrap">
            <Icon name="users" size={19} />
            <span className="text-text/90">{p.count} confirmed</span>
          </p>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 rise" style={{ ["--i" as string]: 4, ["--base" as string]: "300ms" }}>
          <button
            type="button"
            className="btn btn-primary sm:min-w-[300px]"
            onClick={() => downloadBlob(`${e.slug}.ics`, eventIcs(e, pageUrl), "text/calendar;charset=utf-8")}
          >
            <span>Add to calendar</span>
            <Icon name="arrowUpRight" size={16} className="arrow arrow-ur" />
          </button>
          <ButtonLink to={`/g/${e.slug}`} variant="outline-cobalt" className="sm:min-w-[300px]">
            View gathering
          </ButtonLink>
        </div>
        <p className="mt-5 text-center text-[14px] text-dim font-mono tracking-[0.02em]">Demo confirmation · No payment captured</p>
      </section>
    </div>
  );
}

const numberLeft = (n: number) => (n === 1 ? "One seat" : `${n} seats`);
