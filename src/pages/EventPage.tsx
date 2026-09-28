import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { GatheringEvent } from "../../shared/types";
import { adapter, ApiRequestError, notifyDataChanged } from "../data/adapter";
import { readJoined, writeJoined, type JoinedSeat } from "../data/joined";
import { usePolled } from "../data/usePolled";
import { ButtonLink } from "../components/Button";
import { CopyInvite } from "../components/CopyInvite";
import { Icon } from "../components/Icon";
import { Avatar } from "../components/People";
import { Rolling, Segments } from "../components/Progress";
import {
  durationLabel,
  firstName,
  initials,
  listNames,
  money,
  numberWord,
  pad2,
  progressOf,
  whenLabel,
} from "../lib/format";
import { downloadBlob, eventIcs } from "../lib/files";
import { prefersReducedMotion, useAfterMount, useCountdown, usePrevious } from "../lib/motion";
import { Scene, type SceneMarker } from "../scene/Scene";
import { PLATES } from "../scene/plates";
import { Clock } from "./Home";
import { NotFound } from "./NotFound";

export function EventPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { data: e, error, apply } = usePolled(`event:${slug}`, () => adapter.getEvent(slug));
  const [joined, setJoined] = useState<JoinedSeat | null>(() => readJoined(slug));
  const [celebrate, setCelebrate] = useState<"none" | "run" | "settled">("none");
  const causedQuorum = useRef(false);
  const prevStatus = usePrevious(e?.status);

  useEffect(() => {
    if (e) document.title = `${e.title} — Quorum`;
  }, [e?.title]);

  // Celebrate once per real transition to confirmed; a reload lands settled.
  useEffect(() => {
    if (!e) return;
    if (e.status === "confirmed" && prevStatus === "collecting") {
      setCelebrate(prefersReducedMotion() ? "settled" : "run");
      if (causedQuorum.current) {
        const id = window.setTimeout(() => navigate(`/g/${slug}/confirmed`), prefersReducedMotion() ? 900 : 2300);
        return () => window.clearTimeout(id);
      }
    } else if (e.status === "confirmed" && prevStatus === undefined) {
      setCelebrate("settled");
    }
  }, [e?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error?.code === "not_found") return <NotFound what="gathering" />;

  const plate = e ? PLATES[e.scene] : null;
  const p = e ? progressOf(e) : null;
  const lastSeat = e?.participants[e.minimumPeople - 1];

  const markers: SceneMarker[] =
    e && plate?.seatNode
      ? [
          {
            key: "seat",
            at: plate.anchors?.seatFront ?? plate.seatNode,
            lead: plate.anchors?.seatFront ? [-110, 64] : [-60, -120],
            ripple: e.status === "collecting",
            delay: 1300,
            hideLabelOnMobile: true,
            label:
              e.status === "confirmed" && lastSeat ? (
                <>
                  {firstName(lastSeat.name)} took
                  <br />
                  the last seat
                </>
              ) : e.status === "expired" ? undefined : p?.remaining === 1 ? (
                <>
                  The last seat
                  <br />
                  could be yours
                </>
              ) : (
                <>
                  An open seat
                  <br />
                  is waiting
                </>
              ),
          },
        ]
      : [];

  const headlineLines = (e?.headline ?? " ").split(/(?<=\.)\s+/);

  return (
    <div className="relative">
      <section className="relative lg:min-h-[calc(100svh-var(--header-h))] flex flex-col">
        <div className="wrap relative z-10 flex-1 grid lg:grid-cols-[minmax(0,1fr)_400px] gap-x-12 gap-y-8 pt-6 md:pt-10 lg:pt-8 pb-8">
          {/* story */}
          <div className="flex flex-col min-w-0">
            <Link to="/explore" className="btn btn-quiet self-start -ml-1 text-muted hover:text-text font-mono !text-[14px] tracking-[0.02em]">
              <Icon name="arrowLeft" size={16} className="arrow arrow-l" />
              <span className="u">Explore gatherings</span>
            </Link>
            <h1 className="display display-xl mt-8 lg:mt-12 max-w-[780px]">
              {e &&
                headlineLines.map((line, i) => (
                  <span key={i} className="block rise" style={{ ["--i" as string]: i }}>
                    {line}
                  </span>
                ))}
            </h1>
            {e && (
              <>
                <p className="mt-6 lg:mt-8 text-[26px] md:text-[34px] font-light tracking-[-0.02em] leading-tight rise" style={{ ["--i" as string]: 2 }}>
                  {e.title}
                </p>
                <p className="mt-5 flex items-center gap-4 text-[17px] rise" style={{ ["--i" as string]: 3 }}>
                  <span className="grid place-items-center size-12 rounded-full bg-[#1b252d] border border-line font-mono text-[15px]">
                    {initials(e.hostName)}
                  </span>
                  <span className="text-muted">
                    Hosted by <span className="text-text">{e.hostName}</span>
                  </span>
                  {e.isDemoFixture && <span className="chip text-dim !text-[10.5px] ml-1">Demo</span>}
                </p>
                <p className="mt-6 max-w-[460px] text-[16.5px] leading-relaxed text-muted rise lg:hidden" style={{ ["--i" as string]: 4 }}>
                  {e.description}
                </p>
              </>
            )}
          </div>

          {/* booking */}
          <div className="lg:row-span-2 lg:pt-2">
            {e ? (
              <BookingPanel
                e={e}
                joined={joined}
                celebrate={celebrate}
                onJoined={(seat, result) => {
                  writeJoined(slug, seat);
                  setJoined(seat);
                  causedQuorum.current = result.reachedQuorum;
                  apply(result.event);
                  notifyDataChanged();
                }}
              />
            ) : (
              <div className="panel min-h-[640px] animate-pulse" />
            )}
          </div>
        </div>

        {/* agenda */}
        {e && (
          <div className="relative z-10 lg:mt-auto border-t border-line bg-ink/70 lg:bg-ink/55 backdrop-blur-sm">
            <div className="wrap grid lg:grid-cols-[minmax(0,1fr)_400px] gap-x-12">
              <div className="grid md:grid-cols-[150px_repeat(3,minmax(0,1fr))] md:items-center gap-x-6 py-5 md:py-0 md:min-h-[88px]">
                <p className="eyebrow text-text mb-3 md:mb-0">The agenda</p>
                {e.agenda.map((item, i) => (
                  <p key={i} className="flex items-baseline gap-3 py-2 md:py-0 md:pl-6 md:border-l border-line text-[15.5px] text-muted">
                    <span className="tnum text-[13px] text-cobalt-hi">{pad2(i + 1)}</span>
                    <span className="text-text/90">{item}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* decorative scene: full-bleed behind the story on desktop, after the essentials on mobile */}
        {e && plate && (
          <Scene
            plate={e.scene}
            priority
            trace={e.status === "collecting"}
            parallax
            seat={e.status === "confirmed" ? "taken" : e.status === "expired" ? "none" : "open"}
            markers={markers}
            focus={[0.85, 0.55]}
            className={`order-last aspect-[4/3] sm:aspect-[16/9] ${e.scene === "seat" ? "event-scene" : "event-scene-wide"}`}
            fade={e.scene === "seat" ? { left: "22%", top: "8%", bottom: "16%", right: "6%" } : { left: "40%", top: "12%", bottom: "30%", right: "10%" }}
            alt=""
          />
        )}
      </section>
    </div>
  );
}

function BookingPanel({
  e,
  joined,
  celebrate,
  onJoined,
}: {
  e: GatheringEvent;
  joined: JoinedSeat | null;
  celebrate: "none" | "run" | "settled";
  onJoined: (seat: JoinedSeat, result: { reachedQuorum: boolean; event: GatheringEvent }) => void;
}) {
  const p = progressOf(e);
  const collecting = e.status === "collecting";
  const confirmed = e.status === "confirmed";
  const expired = e.status === "expired";
  const remainingMs = useCountdown(e.deadline, !collecting);
  const mounted = useAfterMount();

  // participant ids present at first paint don't animate; later arrivals do
  const initialIds = useRef<Set<string> | null>(null);
  if (initialIds.current === null) initialIds.current = new Set(e.participants.map((x) => x.id));

  const mine = joined ? e.participants.find((x) => x.id === joined.commitmentId) : undefined;
  const pageUrl = `${window.location.origin}${import.meta.env.BASE_URL}g/${e.slug}`;

  return (
    <div className="panel-glass relative overflow-hidden p-6 md:p-8 lg:sticky lg:top-[calc(var(--header-h)+16px)]" aria-live="polite">
      <div className="sweep" data-run={celebrate === "run"} aria-hidden="true" />

      <p className={`eyebrow flex items-center gap-2.5 ${confirmed ? "text-cobalt-hi" : "text-text"}`}>
        {confirmed && (
          <svg width="16" height="16" viewBox="0 0 24 24" className="check-draw" data-run={celebrate === "run" ? "true" : "settled"} aria-hidden="true">
            <path d="m4 12.5 5 5L20 6.5" pathLength={1} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {confirmed ? "Quorum reached" : expired ? "Commitments closed" : "Collecting commitments"}
      </p>

      <p className="mt-5 text-[64px] md:text-[72px] font-light leading-none tracking-[-0.045em] flex items-baseline gap-3">
        <Rolling value={p.count} />
        <span className={confirmed ? "text-cobalt-hi" : "text-[#4b5761]"}>/</span>
        <span className={`tnum ${confirmed ? "text-cobalt-hi" : "text-[#4b5761]"}`}>{pad2(p.total)}</span>
      </p>

      <p className="mt-4 text-[20px] font-light tracking-[-0.01em] min-h-[1.5em]">
        {confirmed ? (
          <span key="happening" className={celebrate === "run" ? "flip-in inline-block" : ""}>
            It’s happening.
          </span>
        ) : expired ? (
          <span className="text-muted">This one didn’t reach quorum in time.</span>
        ) : joined ? (
          <span className="text-muted">
            {p.remaining === 1 ? "One more yes makes it real." : `${numberWord(p.remaining)} more people make it real.`}
          </span>
        ) : (
          <span className="text-muted">
            {p.remaining === 1 ? "You could make this happen." : `${numberWord(p.remaining)} more people make it happen.`}
          </span>
        )}
      </p>

      <Segments total={p.total} filled={Math.min(p.count, p.total)} size="lg" className="mt-6" />

      <dl className="mt-7 grid grid-cols-2 border-t border-line">
        {[
          ["When", whenLabel(e)],
          ["Where", e.location],
          ["Duration", durationLabel(e.durationMinutes)],
          [joined ? "Your commitment" : "Your commitment", e.priceCents ? money(e.priceCents) : "Free"],
        ].map(([k, v], i) => (
          <div key={k} className={`py-4 border-b border-line ${i % 2 ? "pl-5" : "pr-5"}`}>
            <dt className="text-[12.5px] font-mono tracking-[0.1em] uppercase text-muted">{k}</dt>
            <dd className="mt-1.5 text-[17px] text-text">{v}</dd>
          </div>
        ))}
      </dl>

      {/* who's in */}
      <div className="mt-6">
        <ul className="flex flex-wrap gap-2" aria-label="Committed participants">
          {e.participants.map((x) => (
            <li key={x.id} className={mounted && !initialIds.current!.has(x.id) ? "row-enter" : ""}>
              <Avatar name={x.name} size={42} photo={false} className={x.id === mine?.id ? "!border-cobalt" : ""} />
            </li>
          ))}
          {Array.from({ length: Math.max(0, p.total - p.count) }, (_, i) => (
            <li key={`open-${i}`}>
              <span className="grid place-items-center size-[42px] rounded-full border border-dashed border-[#3b4751] text-dim" title="Open seat">
                <Icon name="plus" size={14} />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[16.5px]">
          {p.count === 0 ? (
            <span className="text-muted">Nobody yet — be the first yes.</span>
          ) : (
            <>
              {listNames(
                mine ? ["You", ...e.participants.filter((x) => x.id !== mine.id).map((x) => x.name)] : e.participants.map((x) => x.name),
              )}{" "}
              {p.count === 1 && !mine ? "is in." : "are in."}
            </>
          )}
        </p>
      </div>

      {collecting && !mine && <JoinForm e={e} onJoined={onJoined} />}

      {collecting && mine && (
        <div className="mt-6 border border-cobalt/50 bg-cobalt/[0.07] p-5 row-enter">
          <p className="flex items-center gap-2.5 text-[17px]">
            <Icon name="check" size={18} className="text-cobalt-hi" /> You’re in, {firstName(mine.name)}.
          </p>
          <p className="mt-2 text-[15px] text-muted">
            We’ll confirm the moment {p.remaining === 1 ? "one more person joins" : `${p.remaining} more people join`}. Share the
            seat to get there faster.
          </p>
          <CopyInvite slug={e.slug} className="mt-2" />
        </div>
      )}

      {confirmed && (
        <div className={`mt-6 grid gap-3 ${celebrate === "run" ? "flip-in" : ""}`}>
          <ButtonLink to={`/g/${e.slug}/confirmed`} arrow="up-right" className="w-full">
            {mine ? "See your confirmation" : "See who’s going"}
          </ButtonLink>
          <button
            type="button"
            className="btn btn-outline w-full"
            onClick={() => downloadBlob(`${e.slug}.ics`, eventIcs(e, pageUrl), "text/calendar;charset=utf-8")}
          >
            <Icon name="calendar" size={17} /> Add to calendar
          </button>
        </div>
      )}

      <div className="mt-7 pt-6 border-t border-line">
        {collecting ? (
          <>
            <p className="eyebrow text-text">Closes in</p>
            <Clock ms={remainingMs} className="block mt-2 text-[40px] font-light text-text leading-none" />
          </>
        ) : confirmed ? (
          <>
            <p className="eyebrow text-muted">Countdown stopped</p>
            <p className="mt-2 text-[17px]">Confirmed with {p.count} people · {money(p.committedCents)} in demo commitments</p>
          </>
        ) : (
          <>
            <p className="eyebrow text-muted">Closed</p>
            <p className="mt-2 text-[17px] text-muted">
              {p.count} of {p.total} committed. Nobody is charged.
            </p>
          </>
        )}
        <p className="mt-5 text-[15px] text-muted leading-relaxed">
          {collecting
            ? p.remaining === 1
              ? "Your commitment confirms the gathering the moment you join."
              : `The gathering confirms when ${p.total} people commit. Nobody is charged if it doesn’t.`
            : confirmed
              ? "Demo confirmation — no payment was captured."
              : "Demo gathering — no payment was captured."}
        </p>
      </div>
    </div>
  );
}

function JoinForm({
  e,
  onJoined,
}: {
  e: GatheringEvent;
  onJoined: (seat: JoinedSeat, result: { reachedQuorum: boolean; event: GatheringEvent }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErr, setFieldErr] = useState<{ name?: string; email?: string }>({});
  const [formErr, setFormErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // one key per distinct attempt; a retry of the same details reuses it (idempotent)
  const attempt = useRef<{ sig: string; key: string } | null>(null);

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const fe: typeof fieldErr = {};
    if (name.trim().length < 2) fe.name = "Add your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) fe.email = "Use a valid email address.";
    setFieldErr(fe);
    setFormErr(null);
    if (fe.name || fe.email) {
      document.getElementById(fe.name ? "join-name" : "join-email")?.focus();
      return;
    }
    const sig = `${name.trim()}|${email.trim().toLowerCase()}`;
    if (attempt.current?.sig !== sig) attempt.current = { sig, key: crypto.randomUUID() };

    setPending(true);
    try {
      const result = await adapter.join(e.slug, { name, email, idempotencyKey: attempt.current.key });
      attempt.current = null;
      onJoined({ name: name.trim(), commitmentId: result.commitmentId }, result);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === "invalid" && Object.keys(err.fields).length) {
          setFieldErr({ name: err.fields.name, email: err.fields.email });
        } else {
          setFormErr(err.message);
          if (err.code !== "server") attempt.current = null;
        }
        if (["expired", "confirmed", "full"].includes(err.code)) notifyDataChanged();
      } else {
        setFormErr("Something went wrong. Try again.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
      <div>
        <label htmlFor="join-name" className="field-label !tracking-[0.1em] !normal-case !font-sans !text-[14px] !text-muted !mb-2">
          Your name
        </label>
        <input
          id="join-name"
          className="input"
          autoComplete="name"
          placeholder="Alex Rivera"
          value={name}
          aria-invalid={fieldErr.name ? true : undefined}
          aria-describedby={fieldErr.name ? "join-name-err" : undefined}
          onChange={(ev) => setName(ev.target.value)}
        />
        {fieldErr.name && <p id="join-name-err" className="field-error">{fieldErr.name}</p>}
      </div>
      <div>
        <label htmlFor="join-email" className="field-label !tracking-[0.1em] !normal-case !font-sans !text-[14px] !text-muted !mb-2">
          Your email
        </label>
        <input
          id="join-email"
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="alex@example.com"
          value={email}
          aria-invalid={fieldErr.email ? true : undefined}
          aria-describedby={fieldErr.email ? "join-email-err" : undefined}
          onChange={(ev) => setEmail(ev.target.value)}
        />
        {fieldErr.email && <p id="join-email-err" className="field-error">{fieldErr.email}</p>}
      </div>
      <button type="submit" className="btn btn-primary w-full mt-1 !min-h-[52px] !text-[17px]" disabled={pending}>
        {pending ? (
          "Holding your seat…"
        ) : (
          <>
            I’m in — {e.priceCents ? money(e.priceCents) : "free"}
            <Icon name="arrowUpRight" size={16} className="arrow arrow-ur" />
          </>
        )}
      </button>
      {formErr && (
        <p role="alert" className="text-[15px] text-danger -mt-1">
          {formErr}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 -mt-1">
        <p className="text-[14px] text-muted">Demo commitment. No card charged.</p>
        {e.slug === "portfolio-night" && (
          <button
            type="button"
            className="text-[14px] text-cobalt-ink hover:text-text underline underline-offset-4 decoration-cobalt/50 min-h-11"
            onClick={() => {
              setName("Alex Rivera");
              setEmail("alex@example.com");
              setFieldErr({});
            }}
          >
            Fill demo visitor
          </button>
        )}
      </div>
    </form>
  );
}
