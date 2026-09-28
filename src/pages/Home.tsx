import { Link } from "react-router";
import type { GatheringEvent } from "../../shared/types";
import { adapter } from "../data/adapter";
import { usePolled } from "../data/usePolled";
import { ButtonLink } from "../components/Button";
import { CopyInvite } from "../components/CopyInvite";
import { EventCard } from "../components/EventCard";
import { Icon } from "../components/Icon";
import { Rolling, Segments } from "../components/Progress";
import { firstName, money, pad2, progressOf, relativeWhen } from "../lib/format";
import { useCountdown } from "../lib/motion";
import { Scene, type SceneMarker } from "../scene/Scene";
import { PLATES } from "../scene/plates";
import { Footer } from "../Shell";

const DEMO = "portfolio-night";

export function Clock({ ms, className = "" }: { ms: number; className?: string }) {
  const s = Math.floor(ms / 1000);
  return (
    <span className={`tnum ${className}`}>
      {pad2(Math.floor(s / 3600))}:{pad2(Math.floor((s % 3600) / 60))}:{pad2(s % 60)}
    </span>
  );
}

function LiveCard({ e }: { e: GatheringEvent | null }) {
  const p = e ? progressOf(e) : null;
  const remainingMs = useCountdown(e?.deadline ?? null, e?.status !== "collecting");
  const confirmed = e?.status === "confirmed";
  const expired = e?.status === "expired";

  return (
    <div className="panel-glass w-full p-6 md:p-7 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.9)]">
      <p className="eyebrow text-muted flex items-center gap-2.5">
        <span className="dot dot-live" /> Live demo
      </p>
      <h2 className="mt-4 text-[26px] font-light tracking-[-0.02em] leading-tight">AI Portfolio Night</h2>
      <p className="mt-1.5 text-[15px] text-muted">{e ? `${relativeWhen(e)} · ${e.location}` : " "}</p>

      <div className="mt-6 pt-6 border-t border-line">
        <p className="text-[52px] font-light leading-none tracking-[-0.04em] flex items-baseline gap-2">
          <Rolling value={p?.count ?? 0} />
          <span className={confirmed ? "text-cobalt-hi" : "text-dim"}>/</span>
          <span className={`tnum ${confirmed ? "text-cobalt-hi" : "text-dim"}`}>{pad2(p?.total ?? 3)}</span>
        </p>
        <p className="mt-3 text-[15px] text-muted min-h-[1.5em]">
          {!p
            ? ""
            : confirmed
              ? "Quorum reached. It’s happening."
              : expired
                ? "The window closed before quorum."
                : p.remaining === 1
                  ? "One more person makes it happen."
                  : `${p.remaining} more people make it happen.`}
        </p>
        <Segments total={p?.total ?? 3} filled={p?.count ?? 0} className="mt-5" />
        <div className="mt-3 flex justify-between text-[13.5px] text-muted">
          <span>
            <span className="text-text tnum">{money(p?.committedCents ?? 0)}</span> committed
          </span>
          <span>
            <span className="text-text tnum">{money(p?.goalCents ?? 1500)}</span> goal
          </span>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-line">
        {confirmed ? (
          <p className="flex items-center gap-2.5 text-[24px] font-light tracking-[-0.02em]">
            It’s happening. <Icon name="check" size={22} className="text-cobalt-hi" />
          </p>
        ) : (
          <>
            <p className="text-[13px] text-muted">{expired ? "Closed" : "Closes in"}</p>
            <Clock ms={remainingMs} className="block mt-1 text-[26px] text-text" />
          </>
        )}
      </div>

      {confirmed ? (
        <ButtonLink to={`/g/${DEMO}/confirmed`} arrow="up-right" className="mt-6 w-full">
          See who’s going
        </ButtonLink>
      ) : (
        <ButtonLink to={`/g/${DEMO}`} arrow="up-right" className="mt-6 w-full">
          {expired ? "View gathering" : p?.remaining === 1 ? "Take the third seat" : "Take a seat"}
        </ButtonLink>
      )}
      <p className="mt-4 text-[13px] text-dim">Demo commitments. No money moves.</p>
    </div>
  );
}

/** "Maya · committed" where there's room, "Maya · in" where there isn't. */
const Committed = ({ name }: { name: string }) => (
  <>
    {firstName(name)} · <span className="min-[1400px]:hidden">in</span>
    <span className="max-[1399px]:hidden">committed</span>
  </>
);

const STEPS = ["Set the idea", "Gather commitments", "Make it happen"];

export function Home() {
  const { data: demo } = usePolled(`event:${DEMO}`, () => adapter.getEvent(DEMO));
  const { data: events } = usePolled("events:home", () => adapter.listEvents(), 6000);
  const p = demo ? progressOf(demo) : null;
  const confirmed = demo?.status === "confirmed";
  const plate = PLATES.seat;
  const [maya, jordan, third] = demo?.participants ?? [];

  const markers: SceneMarker[] = [
    maya && { key: "a", at: plate.anchors!.maya!, lead: [22, -64], label: <Committed name={maya.name} />, hideLabelOnMobile: true, delay: 700 },
    jordan && { key: "b", at: plate.anchors!.jordan!, lead: [22, -64], label: <Committed name={jordan.name} />, hideLabelOnMobile: true, delay: 780 },
    {
      key: "seat",
      at: plate.seatNode!,
      lead: [-26, -58],
      label: third ? <Committed name={third.name} /> : "Your seat?",
      ripple: !third,
      delay: 1300,
      hideLabelOnMobile: true,
    },
  ].filter(Boolean) as SceneMarker[];

  const active = confirmed ? 2 : 1;

  return (
    <>
      <section className="relative xl:h-[calc(100svh-var(--header-h)-72px)] xl:min-h-[660px] xl:max-h-[880px] overflow-hidden">
        <div className="relative mx-auto max-w-[1600px] h-full grid xl:block">
          <Scene
            plate="seat"
            priority
            trace
            parallax
            seat={third ? "taken" : "open"}
            markers={markers}
            focus={[0.8, 0.6]}
            className="home-scene order-3 aspect-[4/3.2] sm:aspect-[16/9]"
            fade={{ left: "30%", right: "14%", bottom: "22%", top: "10%" }}
            alt="Two people working at a round table under a pendant lamp; an empty chair outlined in blue waits for a third."
          />

          <div className="order-1 relative z-10 wrap h-full grid md:grid-cols-[minmax(0,1fr)_minmax(0,360px)] xl:grid-cols-[minmax(0,1fr)_380px] items-center gap-10 pt-10 pb-10 xl:py-0">
            <div className="max-w-[520px]">
              <p className="eyebrow text-muted rise" style={{ ["--i" as string]: 0 }}>
                Ideas become real, together.
              </p>
              <h1 className="display display-xl mt-6">
                {["Good things", "start with", "a few."].map((line, i) => (
                  <span key={line} className="block rise" style={{ ["--i" as string]: i + 1 }}>
                    {line}
                  </span>
                ))}
              </h1>
              <p className="mt-7 text-[17px] md:text-[18px] text-muted leading-relaxed rise" style={{ ["--i" as string]: 4 }}>
                Launch a workshop. Gather your people.
                <br />
                It only happens when enough people commit.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-3 rise" style={{ ["--i" as string]: 5 }}>
                <ButtonLink to="/create" arrow="up-right">
                  Start something
                </ButtonLink>
                <ButtonLink to="/explore" variant="quiet" arrow="right">
                  Explore the demo
                </ButtonLink>
              </div>
            </div>

            <div className="order-2 rise md:justify-self-end w-full max-w-[440px] md:max-w-none" style={{ ["--i" as string]: 3, ["--base" as string]: "200ms" }}>
              <LiveCard e={demo} />
              <CopyInvite slug={DEMO} className="mt-3 ml-1" />
            </div>
          </div>
        </div>
      </section>

      {/* launch sequence */}
      <section aria-label="The launch sequence" className="border-y border-line bg-ink relative z-10">
        <div className="wrap min-h-[72px] py-4 lg:py-0 grid grid-cols-1 lg:grid-cols-[200px_repeat(3,minmax(0,1fr))_auto] items-center gap-x-10 gap-y-2">
          <p className="eyebrow text-text max-lg:mb-2">The launch sequence</p>
          {STEPS.map((s, i) => (
            <p
              key={s}
              className={`relative flex items-center gap-3 min-h-11 text-[15px] ${
                i === active ? "text-cobalt-hi" : i < active ? "text-muted" : "text-dim"
              }`}
              aria-current={i === active ? "step" : undefined}
            >
              <span className="tnum text-[13px]">{pad2(i + 1)}</span>
              {s}
              {i === active && <span className="absolute left-0 w-[180px] max-w-full -bottom-[1px] lg:-bottom-[14px] h-[2px] bg-cobalt" />}
            </p>
          ))}
          <p className="text-[14.5px] text-muted lg:text-right max-lg:mt-2">
            {p
              ? confirmed
                ? `${p.count} people in. It’s happening.`
                : `${p.count} people in. ${p.remaining} possibilit${p.remaining === 1 ? "y" : "ies"} away.`
              : " "}
          </p>
        </div>
      </section>

      {/* how it works */}
      <section className="wrap py-20 md:py-28">
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 lg:gap-20">
          <div>
            <p className="eyebrow text-muted">How it works</p>
            <h2 className="display display-lg mt-5">
              An idea is
              <br />
              an empty seat.
            </h2>
            <p className="mt-6 text-[17px] text-muted leading-relaxed max-w-[440px]">
              Nothing is scheduled until enough people say yes. Nobody is charged for a gathering that doesn’t happen.
            </p>
          </div>
          <ol className="grid gap-px bg-line border border-line self-start">
            {[
              ["Set the idea", "Name it, price a seat, choose the minimum and a deadline. Your invitation is ready in a minute."],
              ["Gather commitments", "People commit to a seat. Everyone watches the same progress fill — nothing moves while it’s collecting."],
              ["Make it happen", "The moment the last seat fills, the gathering is confirmed for everyone at once."],
            ].map(([t, d], i) => (
              <li key={t} className="bg-ink p-6 md:p-8 grid grid-cols-[48px_1fr] gap-4">
                <span className="tnum text-[14px] text-cobalt-hi pt-1">{pad2(i + 1)}</span>
                <div>
                  <h3 className="text-[22px] font-light tracking-[-0.015em]">{t}</h3>
                  <p className="mt-2 text-[16px] text-muted leading-relaxed">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* open tables */}
      <section className="wrap pb-24">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="eyebrow text-muted">Open tables</p>
            <h2 className="title text-[34px] md:text-[44px] mt-4">Seats waiting for a yes.</h2>
          </div>
          <Link to="/explore" className="btn btn-quiet max-sm:hidden">
            <span className="u">Explore all</span>
            <Icon name="arrowRight" size={16} className="arrow arrow-r" />
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {(events ?? []).filter((e) => e.slug !== DEMO).slice(0, 3).map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
          {!events &&
            Array.from({ length: 3 }, (_, i) => <div key={i} className="min-h-[300px] border border-line bg-panel animate-pulse" />)}
        </div>
        <Link to="/explore" className="btn btn-outline w-full mt-6 sm:hidden">
          Explore all gatherings
        </Link>
      </section>
      <Footer />
    </>
  );
}
