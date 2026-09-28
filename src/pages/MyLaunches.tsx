import { useRef } from "react";
import { Link, useSearchParams } from "react-router";
import type { Activity, Launch } from "../../shared/types";
import { adapter } from "../data/adapter";
import { usePolled } from "../data/usePolled";
import { ButtonLink } from "../components/Button";
import { CopyInvite } from "../components/CopyInvite";
import { Icon } from "../components/Icon";
import { Avatar } from "../components/People";
import { Rolling, Segments } from "../components/Progress";
import { firstName, money, pad2, progressOf, relativeWhen, whenLabel } from "../lib/format";
import { useAfterMount } from "../lib/motion";
import { Scene } from "../scene/Scene";

const clock = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));

function activityLabel(a: Activity) {
  switch (a.type) {
    case "created":
      return "Launch created";
    case "committed":
      return `${firstName(a.actorName ?? "Someone")} committed`;
    case "confirmed":
      return "Quorum reached";
    case "expired":
      return "Deadline passed";
    case "reset":
      return "Demo reset";
  }
}

const HEADLINES = {
  confirmed: "You brought them together.",
  collecting: "Almost a gathering.",
  expired: "Not this time.",
} as const;

export function MyLaunches() {
  const { data } = usePolled("launches", () => adapter.listLaunches());
  const [params, setParams] = useSearchParams();
  const mounted = useAfterMount();
  const seenActivity = useRef<Set<string> | null>(null);

  const launches = data ?? [];
  const current: Launch | undefined = launches.find((l) => l.event.slug === params.get("launch")) ?? launches[0];
  if (current && seenActivity.current === null) seenActivity.current = new Set(current.activity.map((a) => a.id));

  if (!data) {
    return (
      <div className="wrap pt-12 pb-20">
        <div className="h-10 w-72 bg-panel animate-pulse" />
        <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_480px] gap-6">
          <div className="h-[720px] panel animate-pulse" />
          <div className="h-[520px] panel animate-pulse" />
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="wrap py-24 max-w-3xl">
        <p className="eyebrow text-muted">Your launches</p>
        <h1 className="display display-lg mt-5">Nothing launched yet.</h1>
        <ButtonLink to="/create" arrow="up-right" className="mt-10">
          Create a launch
        </ButtonLink>
      </div>
    );
  }

  const e = current.event;
  const p = progressOf(e);
  const confirmed = e.status === "confirmed";
  const others = launches.filter((l) => l.event.id !== e.id);

  return (
    <div className="wrap pt-8 md:pt-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-muted rise">Your launches</p>
          <h1 className="display display-lg mt-4 rise" style={{ ["--i" as string]: 1 }} key={e.status}>
            {HEADLINES[e.status]}
          </h1>
        </div>
        <ButtonLink to="/create" arrow="up-right" className="rise max-md:w-full" style={{ ["--i" as string]: 2 }}>
          Create another launch
        </ButtonLink>
      </div>

      <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_500px] gap-6 items-start">
        <div className="min-w-0 grid gap-6">
          <article className="panel overflow-hidden rise" style={{ ["--i" as string]: 2 }}>
            <div className="relative h-[260px] md:h-[400px]">
              <Scene
                plate={confirmed ? "circle" : e.scene === "seat" ? "seat" : e.scene}
                className="absolute inset-0"
                focus={confirmed ? [0.45, 0.4] : [0.8, 0.6]}
                trace={!confirmed && e.scene === "seat"}
                seat={e.status === "collecting" ? "open" : "none"}
                fade={{ bottom: "46%" }}
                parallax
              />
              <div className="absolute inset-x-0 bottom-0 z-10 p-5 md:p-7">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <h2 className="title text-[32px] md:text-[48px]">{e.title}</h2>
                  <span className={`chip ${confirmed ? "chip-solid" : ""}`}>
                    {!confirmed && <span className="dot dot-live" />}
                    {e.status}
                  </span>
                </div>
                <p className="meta text-muted mt-3 !text-[12.5px]">
                  {whenLabel(e)} · {e.location}
                </p>
              </div>
            </div>

            <div className="px-5 md:px-7">
              <div className="grid grid-cols-2 md:grid-cols-3 border-b border-line">
                <div className="py-6 pr-4">
                  <p className="text-[40px] font-light leading-none tracking-[-0.04em] flex items-baseline gap-2">
                    <Rolling value={p.count} />
                    <span className="text-dim">/</span>
                    <span className="tnum text-dim">{pad2(p.total)}</span>
                  </p>
                  <p className="meta text-muted mt-3 !text-[12px]">People</p>
                </div>
                <div className="py-6 pl-5 md:px-8 border-l border-line">
                  <p className="text-[40px] font-light leading-none tracking-[-0.03em] tnum">{money(p.committedCents)}</p>
                  <p className="meta text-muted mt-3 !text-[12px]">Demo commitments</p>
                </div>
                <div className="py-6 md:pl-8 md:border-l border-line col-span-2 md:col-span-1 max-md:border-t flex flex-col justify-center gap-3">
                  <p className="meta !text-[12.5px] flex items-center gap-3">
                    <span className={`dot ${confirmed ? "" : e.status === "expired" ? "!bg-dim" : "dot-live"}`} />
                    {confirmed ? "Confirmed" : e.status === "expired" ? "Expired" : `${p.remaining} to go`}
                  </p>
                  <Segments total={p.total} filled={Math.min(p.count, p.total)} />
                </div>
              </div>

              <table className="w-full mt-2 text-left">
                <caption className="sr-only">Participants</caption>
                <thead>
                  <tr className="meta !text-[12px] text-muted">
                    <th className="font-normal py-4">Person</th>
                    <th className="font-normal py-4 w-[28%] max-sm:hidden">Commitment</th>
                    <th className="font-normal py-4 w-[26%] max-sm:w-auto">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {e.participants.map((x) => (
                    <tr key={x.id} className={`border-t border-line ${mounted ? "row-enter" : ""}`}>
                      <td className="py-3">
                        <span className="flex items-center gap-4 min-w-0 pr-3">
                          <Avatar name={x.name} size={40} />
                          <span className="truncate text-[16px]">{x.name}</span>
                        </span>
                      </td>
                      <td className="py-3 tnum text-[17px] max-sm:hidden">{e.priceCents ? money(e.priceCents) : "Free"}</td>
                      <td className="py-3 text-[15.5px] text-muted">
                        <span className="flex items-center gap-2.5">
                          <span className={`dot ${confirmed ? "" : "!bg-transparent border border-cobalt"}`} />
                          {confirmed ? "Confirmed" : "Committed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {e.participants.length === 0 && (
                    <tr className="border-t border-line">
                      <td colSpan={3} className="py-6 text-muted">
                        No commitments yet. Share the invite to fill the first seat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 py-6 border-t border-line">
                <ButtonLink to={`/g/${e.slug}`} arrow="up-right" size="sm">
                  Open event
                </ButtonLink>
                <CopyInvite slug={e.slug} />
              </div>
            </div>
          </article>

          {others.length > 0 && (
            <section aria-label="Other launches" className="grid gap-px bg-line border border-line">
              {others.map((l) => {
                const op = progressOf(l.event);
                return (
                  <button
                    key={l.event.id}
                    type="button"
                    className="bg-ink hover:bg-panel transition-colors text-left p-5 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_180px_auto] items-center gap-5 focus-inset"
                    onClick={() => setParams({ launch: l.event.slug }, { replace: true })}
                  >
                    <span className="min-w-0">
                      <span className="block text-[18px] truncate">{l.event.title}</span>
                      <span className="block meta text-muted !text-[11.5px] mt-1.5">{relativeWhen(l.event)} · {l.event.status}</span>
                    </span>
                    <span className="max-md:hidden">
                      <span className="block text-[13px] text-muted mb-2 tnum">
                        {op.count}/{op.total}
                      </span>
                      <Segments total={op.total} filled={Math.min(op.count, op.total)} />
                    </span>
                    <Icon name="arrowRight" size={18} className="text-muted" />
                  </button>
                );
              })}
            </section>
          )}

          <Link to="/create" className="dashed group flex items-center gap-4 min-h-[76px] px-6 text-[16.5px] text-text">
            <Icon name="plus" size={20} className="text-muted" />
            Create your next gathering
            <Icon name="arrowRight" size={17} className="transition-transform duration-150 group-hover:translate-x-[3px]" />
          </Link>
        </div>

        <aside className="grid gap-6 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
          <section className="panel p-6 md:p-7 rise" style={{ ["--i" as string]: 3 }}>
            <h2 className="text-[26px] font-light tracking-[-0.02em]">How it happened</h2>
            <ol className="timeline mt-6 grid gap-7">
              {current.activity.map((a) => {
                const hot = a.type === "confirmed";
                const fresh = mounted && seenActivity.current && !seenActivity.current.has(a.id);
                return (
                  <li key={a.id} className={`relative grid grid-cols-[24px_64px_1fr] items-center gap-4 ${fresh ? "row-enter" : ""}`}>
                    <span
                      className={`relative z-10 size-[23px] rounded-full border-[1.5px] bg-panel ${
                        hot ? "border-cobalt shadow-[0_0_16px_rgb(49_91_255/0.7)]" : "border-[#6f7a83]"
                      }`}
                    />
                    <span className={`tnum text-[17px] ${hot ? "text-cobalt-hi" : "text-muted"}`}>{clock(a.createdAt)}</span>
                    <span className={`text-[17px] ${hot ? "text-cobalt-hi" : "text-text/90"}`}>{activityLabel(a)}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="panel p-6 md:p-7 rise" style={{ ["--i" as string]: 4 }}>
            <p className="text-[20px] font-light text-muted">Next up</p>
            <h2 className="text-[28px] font-light tracking-[-0.02em] mt-1">
              {confirmed ? "Host your gathering" : e.status === "expired" ? "Try another date" : p.remaining === 1 ? "Fill the last seat" : "Share your invite"}
            </h2>
            <p className="mt-5 flex items-center gap-3 text-[16.5px] text-text/90">
              <Icon name="calendar" size={19} className="text-muted" />
              {confirmed || e.status === "expired" ? relativeWhen(e).replace(",", " at") : `Closes ${relativeWhen({ startsAt: e.deadline, timezone: e.timezone }).replace(",", " at")}`}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={adapter.attendeesCsvUrl(e.slug)} download className="btn btn-outline btn-sm">
                <Icon name="download" size={16} /> Download attendee list
              </a>
              {e.status === "expired" && (
                <ButtonLink to="/create" variant="outline" size="sm">
                  Relaunch
                </ButtonLink>
              )}
            </div>
          </section>
          <p className="text-[13.5px] text-dim font-mono tracking-[0.01em] px-1">
            Demo workspace · Payments and notifications are simulated.
          </p>
        </aside>
      </div>
    </div>
  );
}
