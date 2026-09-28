import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import type { Category, CreateEventInput } from "../../shared/types";
import { utcToZoned, zonedToUtc } from "../../shared/time";
import { adapter, ApiRequestError, notifyDataChanged } from "../data/adapter";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { useToast } from "../components/Toast";
import { dateLabel, money, pad2, timeLabel, tzAbbr } from "../lib/format";
import { Scene } from "../scene/Scene";
import { PLATES } from "../scene/plates";

const DRAFT_KEY = "quorum:draft";
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";

interface Form {
  title: string;
  description: string;
  category: Category;
  date: string;
  time: string;
  location: string;
  price: string;
  minimum: string;
  deadline: string;
  demoCommitments: boolean;
}

function defaults(): Form {
  const tomorrow = utcToZoned(new Date(Date.now() + 86_400_000), TZ).date;
  return {
    title: "",
    description: "",
    category: "workshop",
    date: tomorrow,
    time: "18:00",
    location: "Online",
    price: "5",
    minimum: "3",
    deadline: `${tomorrow}T12:00`,
    demoCommitments: true,
  };
}

function loadDraft(): Form | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...defaults(), ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

type Errors = Partial<Record<keyof Form, string>>;

function validate(f: Form): Errors {
  const e: Errors = {};
  if (f.title.trim().length < 3) e.title = "Name it in at least 3 characters.";
  if (f.title.trim().length > 70) e.title = "Keep it under 70 characters.";
  if (f.description.trim().length < 8) e.description = "Tell people what they’ll do (8+ characters).";
  if (f.description.trim().length > 200) e.description = "Keep it under 200 characters.";
  if (f.location.trim().length < 2) e.location = "Where is it?";
  const price = Number(f.price);
  if (f.demoCommitments && (!/^\d+$/.test(f.price) || price < 1 || price > 500)) e.price = "Whole dollars, $1–$500.";
  const min = Number(f.minimum);
  if (!/^\d+$/.test(f.minimum) || min < 2 || min > 50) e.minimum = "Between 2 and 50 people.";
  const start = zonedToUtc(f.date, f.time, TZ);
  const [dd, dt] = f.deadline.split("T");
  const deadline = zonedToUtc(dd ?? "", (dt ?? "").slice(0, 5), TZ);
  if (!start) e.date = "Pick a date.";
  else if (start.getTime() < Date.now() + 30 * 60_000) e.date = "Start at least 30 minutes from now.";
  if (!deadline) e.deadline = "Pick a deadline.";
  else if (deadline.getTime() <= Date.now() + 5 * 60_000) e.deadline = "Give people more than a few minutes.";
  else if (start && deadline >= start) e.deadline = "The deadline must come before it starts.";
  return e;
}

const STEP_FIELDS: (keyof Form)[][] = [
  ["title", "description", "category"],
  ["date", "time", "location", "price", "minimum", "deadline"],
  ["demoCommitments"],
];
const STEP_NAMES = ["The idea", "The details", "Launch"];

function Field({
  id,
  label,
  error,
  icon,
  children,
  hint,
}: {
  id: string;
  label: string;
  error?: string;
  icon?: IconName;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label flex items-baseline justify-between gap-3">
        {label}
        {hint && <span className="normal-case tracking-normal font-sans text-[12.5px] text-dim">{hint}</span>}
      </label>
      <div className={icon ? "input-icon" : undefined}>
        {children}
        {icon && <Icon name={icon} size={19} />}
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Crossfades its text whenever the value changes. */
const Live = ({ v, className = "" }: { v: string; className?: string }) => (
  <span key={v} className={`crossfade ${className}`}>
    {v}
  </span>
);

export function Create() {
  const navigate = useNavigate();
  const toast = useToast();
  const [restored] = useState(() => loadDraft());
  const [form, setForm] = useState<Form>(() => restored ?? defaults());
  const [touched, setTouched] = useState<Partial<Record<keyof Form, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const errors = useMemo(() => ({ ...validate(form), ...serverErrors }), [form, serverErrors]);
  const show = (k: keyof Form) => (touched[k] || attempted ? errors[k] : undefined);

  // autosave draft locally
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch {
        /* storage unavailable */
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [form]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setServerErrors((s) => ({ ...s, [k]: undefined }));
  };
  const blur = (k: keyof Form) => () => setTouched((t) => ({ ...t, [k]: true }));
  const aria = (k: keyof Form) => ({
    "aria-invalid": show(k) ? true : undefined,
    "aria-describedby": show(k) ? `${k}-error` : undefined,
    onBlur: blur(k),
  });

  const focusStep = (i: number) => {
    setStep(i);
    const first = STEP_FIELDS[i]![0]!;
    formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
  };

  // preview values (only valid ones flow through; otherwise fall back gracefully)
  const min = /^\d+$/.test(form.minimum) && +form.minimum >= 2 ? +form.minimum : null;
  const price = form.demoCommitments ? (/^\d+$/.test(form.price) ? +form.price : null) : 0;
  const start = zonedToUtc(form.date, form.time, TZ);
  const startIso = start?.toISOString();
  const tz = startIso ? tzAbbr(startIso, TZ) : "";
  const plate = PLATES.table;

  async function publish(ev: React.FormEvent) {
    ev.preventDefault();
    setAttempted(true);
    const v = validate(form);
    if (Object.keys(v).length) {
      const first = (Object.keys(v) as (keyof Form)[])[0]!;
      formRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const input: CreateEventInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        date: form.date,
        time: form.time,
        deadline: form.deadline,
        timezone: TZ,
        location: form.location.trim(),
        priceDollars: form.demoCommitments ? Number(form.price) : 0,
        minimumPeople: Number(form.minimum),
        demoCommitments: form.demoCommitments,
      };
      const created = await adapter.createEvent(input);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      notifyDataChanged();
      toast("Your launch is live");
      navigate(`/g/${created.slug}`);
    } catch (e) {
      if (e instanceof ApiRequestError) {
        const map: Record<string, keyof Form> = { priceDollars: "price", minimumPeople: "minimum" };
        const fe: Errors = {};
        for (const [k, msg] of Object.entries(e.fields)) fe[(map[k] ?? k) as keyof Form] = msg;
        setServerErrors(fe);
        if (!Object.keys(fe).length) toast(e.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wrap pt-10 md:pt-14 pb-20 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-12 xl:gap-24">
      <div className="min-w-0 max-w-[900px]">
        <h1 className="display display-xl">
          <span className="block rise" style={{ ["--i" as string]: 0 }}>Give your idea</span>
          <span className="block rise" style={{ ["--i" as string]: 1 }}>a first yes.</span>
        </h1>
        <p className="mt-5 text-[18px] md:text-[20px] text-muted rise" style={{ ["--i" as string]: 2 }}>
          Set the plan. We’ll help you gather the people.
        </p>

        <nav aria-label="Steps" className="mt-10 flex gap-8 md:gap-12 overflow-x-auto scrollbar-none rise" style={{ ["--i" as string]: 3 }}>
          {STEP_NAMES.map((n, i) => (
            <button
              key={n}
              type="button"
              className="tab meta !text-[13px] shrink-0"
              aria-current={step === i ? "step" : undefined}
              onClick={() => focusStep(i)}
            >
              <span className={`mr-3 ${step === i ? "text-cobalt-hi" : "text-dim"}`}>{pad2(i + 1)}</span>
              <span className={step === i ? "text-cobalt-hi" : ""}>{n}</span>
            </button>
          ))}
        </nav>

        {restored && (
          <p className="mt-6 text-[14px] text-dim flex items-center gap-3">
            <Icon name="info" size={16} /> Restored your saved draft.
            <button
              type="button"
              className="underline underline-offset-4 hover:text-text min-h-11"
              onClick={() => {
                setForm(defaults());
                setTouched({});
                setAttempted(false);
                try {
                  localStorage.removeItem(DRAFT_KEY);
                } catch {
                  /* ignore */
                }
              }}
            >
              Start fresh
            </button>
          </p>
        )}

        <form ref={formRef} onSubmit={publish} noValidate className="mt-8 grid gap-6">
          <fieldset className="grid gap-6" onFocus={() => setStep(0)}>
            <legend className="sr-only">The idea</legend>
            <Field id="title" label="Gathering name" error={show("title")}>
              <input
                id="title"
                data-field="title"
                className="input"
                value={form.title}
                maxLength={70}
                placeholder="AI Portfolio Night"
                onChange={(e) => set("title", e.target.value)}
                {...aria("title")}
              />
            </Field>
            <Field id="description" label="What will people do?" error={show("description")} hint={`${form.description.length}/200`}>
              <textarea
                id="description"
                className="input"
                rows={3}
                maxLength={200}
                value={form.description}
                placeholder="Bring your portfolio. Leave with a sharper story."
                onChange={(e) => set("description", e.target.value)}
                {...aria("description")}
              />
            </Field>
            <div>
              <span className="field-label" id="category-label">Kind of gathering</span>
              <div role="radiogroup" aria-labelledby="category-label" className="grid grid-cols-3 border border-line rounded-[3px] p-1 gap-1">
                {(["workshop", "meetup", "creative"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={form.category === c}
                    className={`min-h-11 rounded-[2px] text-[15px] capitalize transition-colors duration-150 ${
                      form.category === c ? "bg-[#18232b] text-text" : "text-muted hover:text-text"
                    }`}
                    onClick={() => set("category", c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset className="grid sm:grid-cols-2 gap-x-8 gap-y-6" onFocus={() => setStep(1)}>
            <legend className="sr-only">The details</legend>
            <Field id="date" label="Date" error={show("date")}>
              <input id="date" data-field="date" type="date" className="input" value={form.date} onChange={(e) => set("date", e.target.value)} {...aria("date")} />
            </Field>
            <Field id="time" label="Time" error={show("time")} hint={tz}>
              <input id="time" type="time" className="input" value={form.time} step={900} onChange={(e) => set("time", e.target.value)} {...aria("time")} />
            </Field>
            <Field id="location" label="Location" error={show("location")} icon="pin">
              <input id="location" className="input" value={form.location} maxLength={60} placeholder="Online" onChange={(e) => set("location", e.target.value)} {...aria("location")} />
            </Field>
            <Field id="price" label="Price per person" error={show("price")} icon="dollar" hint={!form.demoCommitments ? "Free" : undefined}>
              <input
                id="price"
                inputMode="numeric"
                className="input disabled:opacity-40"
                value={form.demoCommitments ? form.price : "0"}
                disabled={!form.demoCommitments}
                onChange={(e) => set("price", e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                {...aria("price")}
              />
            </Field>
            <Field id="minimum" label="Minimum people" error={show("minimum")} icon="user">
              <input
                id="minimum"
                inputMode="numeric"
                className="input"
                value={form.minimum}
                onChange={(e) => set("minimum", e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                {...aria("minimum")}
              />
            </Field>
            <Field id="deadline" label="Deadline" error={show("deadline")} hint={tz}>
              <input id="deadline" type="datetime-local" className="input" value={form.deadline} step={900} onChange={(e) => set("deadline", e.target.value)} {...aria("deadline")} />
            </Field>
          </fieldset>

          <fieldset className="pt-2" onFocus={() => setStep(2)}>
            <legend className="sr-only">Launch</legend>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                role="switch"
                data-field="demoCommitments"
                aria-checked={form.demoCommitments}
                aria-labelledby="demo-label"
                className="switch"
                onClick={() => set("demoCommitments", !form.demoCommitments)}
              />
              <span id="demo-label" className="text-[16px]">Demo commitments</span>
              <span className="text-[14px] text-dim">
                {form.demoCommitments ? "No money moves in this prototype." : "Free gathering — people just commit a seat."}
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
              <button type="submit" className="btn btn-primary min-w-[240px] max-sm:w-full" disabled={submitting}>
                <span>{submitting ? "Publishing…" : "Publish gathering"}</span>
                {!submitting && <Icon name="arrowUpRight" size={16} className="arrow arrow-ur" />}
              </button>
              <Button
                variant="quiet"
                onClick={() => {
                  try {
                    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
                    toast("Draft saved on this device");
                  } catch {
                    toast("Couldn’t save — storage is unavailable");
                  }
                }}
              >
                Save draft
              </Button>
            </div>
            {attempted && Object.keys(errors).filter((k) => errors[k as keyof Form]).length > 0 && (
              <p className="field-error mt-4" role="alert">
                A few details need attention before this can go live.
              </p>
            )}
          </fieldset>
        </form>
      </div>

      {/* live preview */}
      <aside aria-label="Live preview" className="lg:sticky lg:top-[calc(var(--header-h)+24px)] self-start">
        <div className="panel !bg-ink relative overflow-hidden flex flex-col min-h-[calc(72vw+220px)] sm:min-h-[640px] lg:h-[calc(100svh-var(--header-h)-60px)] lg:min-h-[700px] lg:max-h-[940px]">
          <Scene
            plate="table"
            trace
            className="absolute inset-x-0 top-0 aspect-[1165/815]"
            focus={[0.5, 0.5]}
            fade={{ bottom: "34%", top: "16%" }}
            markers={[
              { key: "1", at: plate.anchors!.one!, lead: [18, -42], label: <span className="text-cobalt-hi tracking-[0.05em] text-[15px]">01</span>, delay: 600 },
              { key: "2", at: plate.anchors!.two!, lead: [18, -42], label: <span className="text-cobalt-hi tracking-[0.05em] text-[15px]">02</span>, delay: 700 },
              { key: "3", at: plate.seatNode!, lead: [14, -42], label: <span className="text-cobalt-hi tracking-[0.05em] text-[15px]">03</span>, delay: 1300, ripple: true },
            ]}
          />
          <p className="relative z-10 eyebrow text-text flex items-center gap-2.5 p-6 md:p-7">
            <span className="dot dot-live" /> Live preview
          </p>
          <div className="relative z-10 mt-auto p-6 md:p-7">
            <h2 className="title text-[36px] md:text-[48px] break-words">
              <Live v={form.title.trim() || "Your gathering"} className={form.title.trim() ? "" : "text-dim"} />
            </h2>
            <div className="mt-4 grid gap-1 text-[17px] md:text-[19px] text-text/90">
              <Live v={min ? `${min} people make it happen` : "Set a minimum"} />
              <Live v={price === null ? "Set a price" : price === 0 ? "Free to join" : `${money(price * 100)} per seat`} />
              <Live
                v={`${form.location.trim() || "Somewhere"}  ·  ${startIso ? `${dateLabel(startIso, TZ)}, ${timeLabel(startIso, TZ)} ${tz}` : "Pick a date"}`}
              />
            </div>
            <div className="mt-7 pt-6 border-t border-line grid grid-cols-2">
              <div className="pr-6">
                <p className="text-[32px] md:text-[38px] font-light tnum leading-none">
                  <Live v={min !== null && price !== null ? money(min * price * 100) : "—"} />
                </p>
                <p className="meta text-muted mt-3 !text-[12px]">{price === 0 ? "Free gathering" : "Minimum total"}</p>
              </div>
              <div className="pl-6 border-l border-line">
                <p className="text-[32px] md:text-[38px] font-light tnum leading-none">
                  <Live v={min ? String(min) : "—"} />
                </p>
                <p className="meta text-muted mt-3 !text-[12px]">Seats to confirm</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
