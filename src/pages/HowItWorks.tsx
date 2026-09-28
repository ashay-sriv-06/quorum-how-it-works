import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Button, ButtonLink } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { Segments } from "../components/Progress";
import { prefersReducedMotion } from "../lib/motion";
import { Footer } from "../Shell";

const MINIMUM = 3;

const OUTCOMES: { icon: IconName; text: string; tone: string }[] = [
  {
    icon: "users",
    text: "The organizer sets a price, a minimum group size, and a deadline. People commit to join.",
    tone: "text-muted",
  },
  {
    icon: "check",
    text: "Enough people commit before the deadline: the gathering is confirmed.",
    tone: "text-cobalt-ink",
  },
  { icon: "close", text: "Too few commit: it doesn’t go ahead.", tone: "text-danger" },
];

const ORGANIZING = [
  "Describe your gathering.",
  "Choose the price, minimum group size, and deadline.",
  "Share the invitation.",
  "Know whether enough people have committed before you go ahead.",
];

const JOINING = [
  "See the activity, price, and minimum group size.",
  "Commit to taking part.",
  "Follow the group’s progress.",
  "Get a confirmed place if the minimum is reached in time.",
];

const QUESTIONS = [
  {
    q: "What if too few people join?",
    a: "The gathering is not confirmed if the minimum is not reached before the deadline.",
  },
  {
    q: "Is this the same as a waitlist?",
    a: "A waitlist records interest. Quorum asks people to commit to a specific offer with a clear price, minimum group size, and deadline.",
  },
  {
    q: "Does this demo charge money?",
    a: "No. This prototype simulates commitments. The planned payment flow would collect payment only once the gathering is confirmed.",
  },
];

const PROGRESS_MESSAGES = [
  "The organizer is looking for three people.",
  "One person has committed. Two more are needed.",
  "One more person makes this happen.",
  "Confirmed! The workshop can go ahead.",
];

/** Organizer and participant steps; on desktop the rows line up across both columns. */
function Perspective({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <section className="hiw-card p-6 md:p-8 md:grid md:grid-rows-subgrid md:row-span-5" aria-labelledby={id}>
      <h3 id={id} className="text-[24px] md:text-[26px] font-light tracking-[-0.02em] md:pb-3">
        {title}
      </h3>
      <ol className="mt-5 md:mt-0 space-y-4 md:space-y-0 md:grid md:grid-rows-subgrid md:row-span-4">
        {items.map((item, i) => (
          <li key={item} className="flex gap-4 text-[17px] leading-snug md:py-2.5">
            <span className="hiw-step tnum" aria-hidden="true">
              {i + 1}
            </span>
            <span className="pt-0.5">{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Self-contained simulation: local state only, no store writes, no network. */
function Example() {
  const [count, setCount] = useState(0);
  const [expired, setExpired] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const moveFocusToReset = useRef(false);
  const confirmed = count >= MINIMUM;
  const done = confirmed || expired;

  // The button that finished the simulation becomes disabled; keep keyboard focus on the card.
  useEffect(() => {
    if (!moveFocusToReset.current) return;
    moveFocusToReset.current = false;
    root.current?.querySelector<HTMLButtonElement>('[data-sim="reset"]')?.focus();
  }, [count, expired]);

  const finishing = () => {
    moveFocusToReset.current = true;
  };

  const message = expired
    ? "Not confirmed. The deadline passed before enough people joined."
    : PROGRESS_MESSAGES[count];
  const organizer = confirmed
    ? "Your minimum has been reached."
    : expired
      ? "The deadline passed. The workshop won’t go ahead."
      : "Waiting for enough participants";
  const participant = confirmed
    ? "Your place is confirmed."
    : expired
      ? "Not confirmed. The workshop won’t go ahead."
      : count === 0
        ? "No one has committed yet."
        : "Waiting for confirmation";
  const payment = confirmed
    ? "Each participant would pay $5 now. This example charges nothing."
    : expired
      ? "No one would be charged. This example charges nothing."
      : "No one is charged unless the minimum is reached.";

  return (
    <div ref={root} id="example" className="hiw-card hiw-example hiw-anchor overflow-hidden">
      <p className="px-5 md:px-7 py-3 border-b border-line text-[14px] text-muted flex items-start gap-2 bg-panel-2">
        <Icon name="info" size={16} className="shrink-0 mt-[3px]" />
        Interactive example — no reservations or payments are made, and no one is notified.
      </p>

      <div className="p-5 md:p-7">
        <h2
          id="hiw-example"
          tabIndex={-1}
          className="text-[26px] md:text-[32px] font-light tracking-[-0.03em] leading-tight text-balance focus:outline-none"
        >
          Here’s a $5 workshop that needs three people.
        </h2>

        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-4 text-[15px]">
          {[
            ["Event", "AI Portfolio Night"],
            ["Price", "$5 per person"],
            ["Minimum", "3 people"],
            ["Deadline", "Today at 7 PM"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[13px] text-muted">{k}</dt>
              <dd className="mt-0.5">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 pt-6 border-t border-line">
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <ul className="flex gap-3 sm:gap-4" aria-label={`${count} of ${MINIMUM} people committed`}>
              {Array.from({ length: MINIMUM }, (_, i) => {
                const on = i < count;
                return (
                  <li key={i} className="flex flex-col items-center gap-1.5">
                    <span className="hiw-person" data-on={on} data-expired={expired && !on}>
                      <Icon name="user" size={26} />
                    </span>
                    <span className={`text-[12.5px] ${on ? "text-text" : "text-dim"}`}>
                      {on ? "Committed" : "Open"}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-4 pt-2.5">
              <p className="text-[40px] font-light tracking-[-0.03em] leading-none">
                <span className="tnum">{count}</span>
                <span className="text-dim"> of {MINIMUM}</span>
                <span className="sr-only"> committed</span>
              </p>
              {confirmed && (
                <span className="hiw-check" aria-hidden="true">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7.5" pathLength={1} />
                  </svg>
                </span>
              )}
            </div>
          </div>

          <Segments
            total={MINIMUM}
            filled={count}
            size="lg"
            className="mt-5"
            label={`${count} of ${MINIMUM} committed`}
          />

          <p
            className={`mt-4 text-[21px] md:text-[24px] leading-snug min-h-[2.5em] ${
              confirmed ? "text-cobalt-ink" : expired ? "text-danger" : "text-text"
            }`}
            role="status"
          >
            {message}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              className="w-full sm:w-auto"
              icon={<Icon name="plus" size={16} />}
              disabled={done}
              onClick={() => {
                if (count + 1 >= MINIMUM) finishing();
                setCount((c) => Math.min(MINIMUM, c + 1));
              }}
            >
              Add a participant
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none min-h-12"
              icon={<Icon name="clock" size={16} />}
              disabled={done}
              onClick={() => {
                finishing();
                setExpired(true);
              }}
            >
              Show deadline missed
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none min-h-12"
              data-sim="reset"
              icon={<Icon name="refresh" size={16} />}
              onClick={() => {
                setCount(0);
                setExpired(false);
              }}
            >
              Reset
            </Button>
          </div>
          {count === 0 && !expired && (
            <p className="mt-3 text-[14px] text-muted">Tip: click “Add a participant” three times.</p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 border-t border-line">
        <div className="px-5 md:px-7 py-4 sm:border-r border-line">
          <p className="text-[13px] text-muted">The organizer would see</p>
          <p className="mt-1 text-[17px]">{organizer}</p>
        </div>
        <div className="px-5 md:px-7 py-4 border-t sm:border-t-0 border-line">
          <p className="text-[13px] text-muted">A participant would see</p>
          <p className="mt-1 text-[17px]">{participant}</p>
        </div>
      </div>
      <p className="px-5 md:px-7 py-3 border-t border-line text-[14px] text-muted">
        <span className="text-text">Planned payment flow:</span> {payment}
      </p>
    </div>
  );
}

export function HowItWorks() {
  const toExample = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const card = document.getElementById("example");
    if (!card) return;
    card.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    document.getElementById("hiw-example")?.focus({ preventScroll: true });
    history.replaceState(null, "", "#example");
  };

  return (
    <>
      <div className="hiw">
        {/* Introduction beside the example on desktop; stacked on smaller screens */}
        <div className="hiw-wrap pt-10 md:pt-16 pb-16 md:pb-20 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-14 items-start">
          <section aria-labelledby="hiw-title" className="lg:pt-4">
            <p className="eyebrow text-cobalt-ink">How it works</p>
            <h1
              id="hiw-title"
              className="mt-4 text-[38px] md:text-[48px] font-light tracking-[-0.035em] leading-[1.05] max-w-[18ch]"
            >
              Make plans happen when enough people commit.
            </h1>
            <p className="mt-5 text-[18px] leading-relaxed text-text max-w-[48ch]">
              Quorum is for people who run small workshops, meetups, and group experiences — and for the people who join
              them.
            </p>
            <ul className="mt-6 space-y-3.5 max-w-[48ch]">
              {OUTCOMES.map((o) => (
                <li key={o.text} className="flex gap-3.5 text-[17px] leading-snug">
                  <span className={`hiw-outcome ${o.tone}`} aria-hidden="true">
                    <Icon name={o.icon} size={16} />
                  </span>
                  <span className="pt-[3px]">{o.text}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-l-2 border-cobalt pl-4 text-[15px] text-muted max-w-[48ch]">
              A quorum is the minimum number of people needed to move forward.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#example" className="btn btn-primary lg:hidden" onClick={toExample}>
                <span className="u">Try the example</span>
                <Icon name="arrowRight" size={16} className="rotate-90" />
              </a>
              <ButtonLink to="/create" variant="outline" arrow="up-right">
                Create a gathering
              </ButtonLink>
            </div>
          </section>

          <Example />
        </div>

        {/* Two perspectives */}
        <section className="hiw-wrap py-16 md:py-20 border-t border-line" aria-labelledby="hiw-sides">
          <h2 id="hiw-sides" className="text-[30px] md:text-[36px] font-light tracking-[-0.03em] leading-tight">
            Organizers and participants
          </h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 md:gap-x-6 md:gap-y-0">
            <Perspective id="hiw-org" title="I’m organizing" items={ORGANIZING} />
            <Perspective id="hiw-join" title="I’m joining" items={JOINING} />
          </div>
          <p className="mt-8 text-[18px] leading-relaxed max-w-[60ch]">
            Organizers know whether to go ahead. Participants know how many more people are needed.
          </p>
        </section>

        {/* Questions */}
        <section className="hiw-wrap py-16 md:py-20 border-t border-line" aria-labelledby="hiw-faq">
          <h2 id="hiw-faq" className="text-[30px] md:text-[36px] font-light tracking-[-0.03em] leading-tight">
            Questions
          </h2>
          <div className="mt-8 grid md:grid-cols-3 gap-8 md:gap-10">
            {QUESTIONS.map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-[19px] font-normal">{q}</h3>
                <p className="mt-2.5 text-[17px] leading-relaxed text-muted">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section className="hiw-wrap py-16 md:py-20 border-t border-line text-center" aria-labelledby="hiw-cta">
          <h2 id="hiw-cta" className="text-[28px] md:text-[34px] font-light tracking-[-0.03em] leading-tight">
            Have a gathering in mind?
          </h2>
          <ButtonLink to="/create" arrow="up-right" className="mt-7">
            Create your first gathering
          </ButtonLink>
        </section>
      </div>
      <Footer />
    </>
  );
}
