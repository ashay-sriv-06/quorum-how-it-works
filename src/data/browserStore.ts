/**
 * In-browser stand-in for the /api store, used when the app is hosted as static
 * files (GitHub Pages). Same rules and seed data as server/store.ts, kept in this
 * browser's localStorage. Nothing leaves the device: no payments, no emails.
 */
import type {
  Activity,
  ActivityType,
  Category,
  CreateEventInput,
  GatheringEvent,
  JoinInput,
  JoinResult,
  Launch,
} from "../../shared/types";
import { DAY, DEMO_EVENT, DEMO_SLUG, FIXTURES, LA, MIN, ORGANIZER, demoStart, headlineFor } from "../../shared/fixtures";
import { zonedToUtc } from "../../shared/time";
import { ApiRequestError, type QuorumAdapter } from "./adapter";

type EventRec = Omit<GatheringEvent, "participants"> & { organizerId: string | null };
interface CommitmentRec {
  id: string;
  eventId: string;
  name: string;
  email: string;
  key: string | null;
  createdAt: string;
}
interface Db {
  events: EventRec[];
  commitments: CommitmentRec[];
  activity: Activity[];
}

const STORAGE_KEY = "quorum:static-db:v1";
const iso = (ms: number) => new Date(ms).toISOString();
const uuid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

let memory: Db | null = null;

function save(db: Db) {
  memory = db;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* storage unavailable (private mode): keep the in-memory copy */
  }
}

function load(): Db {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return (memory = JSON.parse(raw) as Db);
  } catch {
    /* fall through to a fresh seed */
  }
  const db: Db = { events: [], commitments: [], activity: [] };
  seedFixtures(db);
  resetDemoIn(db);
  save(db);
  return db;
}

const log = (db: Db, eventId: string, type: ActivityType, actorName: string | null, at: number) =>
  db.activity.push({ id: uuid(), eventId, type, actorName, createdAt: iso(at) });

const commit = (db: Db, eventId: string, name: string, email: string, at: number, key: string | null) => {
  const id = uuid();
  db.commitments.push({ id, eventId, name, email, key, createdAt: iso(at) });
  return id;
};

function seedFixtures(db: Db) {
  const now = Date.now();
  for (const f of FIXTURES) {
    const id = uuid();
    let startMs = zonedToUtc(f.date, f.time, LA)!.getTime();
    // keep fixtures in the future if the demo is run later
    while (startMs < now + 2 * DAY) startMs += 7 * DAY;
    db.events.push({
      id,
      slug: f.slug,
      title: f.title,
      headline: f.headline,
      description: f.description,
      category: f.category,
      startsAt: iso(startMs),
      timezone: LA,
      durationMinutes: f.duration,
      location: f.location,
      deadline: iso(Math.min(now + f.deadlineDays * DAY, startMs - 60 * MIN)),
      priceCents: f.price * 100,
      minimumPeople: f.min,
      capacity: f.cap,
      status: f.status,
      hostName: f.host,
      organizerId: null,
      scene: f.scene,
      agenda: f.agenda,
      isDemoFixture: true,
      createdAt: iso(now - 3 * DAY),
    });
    f.people.forEach((p, i) =>
      commit(db, id, p, `${p.toLowerCase().replace(/\W+/g, ".")}@example.com`, now - (2 * DAY - i * 3 * 60 * MIN), null),
    );
  }
}

function resetDemoIn(db: Db) {
  const now = Date.now();
  const start = demoStart();
  const old = db.events.find((e) => e.slug === DEMO_SLUG);
  if (old) {
    db.events = db.events.filter((e) => e.id !== old.id);
    db.commitments = db.commitments.filter((c) => c.eventId !== old.id);
    db.activity = db.activity.filter((a) => a.eventId !== old.id);
  }
  const id = uuid();
  db.events.push({
    id,
    slug: DEMO_SLUG,
    title: DEMO_EVENT.title,
    headline: DEMO_EVENT.headline,
    description: DEMO_EVENT.description,
    category: "workshop",
    startsAt: start.toISOString(),
    timezone: LA,
    durationMinutes: 30,
    location: "Online",
    deadline: iso(Math.min(now + 45 * MIN, start.getTime() - 30 * MIN)),
    priceCents: 500,
    minimumPeople: 3,
    capacity: 3,
    status: "collecting",
    hostName: "Ashay",
    organizerId: ORGANIZER,
    scene: "seat",
    agenda: DEMO_EVENT.agenda,
    isDemoFixture: true,
    createdAt: iso(now - 12 * MIN),
  });
  log(db, id, "created", "Ashay", now - 12 * MIN);
  commit(db, id, "Maya Chen", "maya.chen@example.com", now - 9 * MIN, null);
  log(db, id, "committed", "Maya Chen", now - 9 * MIN);
  commit(db, id, "Jordan Lee", "jordan.lee@example.com", now - 7 * MIN, null);
  log(db, id, "committed", "Jordan Lee", now - 7 * MIN);
}

/** A collecting event whose deadline passed becomes expired, on read. */
function reconcile(db: Db, e: EventRec) {
  if (e.status === "collecting" && Date.parse(e.deadline) <= Date.now()) {
    e.status = "expired";
    log(db, e.id, "expired", null, Date.parse(e.deadline));
    save(db);
  }
  return e;
}

function toEvent(db: Db, e: EventRec): GatheringEvent {
  const { organizerId: _organizer, ...rest } = e;
  void _organizer;
  const participants = db.commitments
    .filter((c) => c.eventId === e.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((c) => ({ id: c.id, name: c.name, createdAt: c.createdAt }));
  return structuredClone({ ...rest, participants });
}

function getEventSync(db: Db, slug: string): GatheringEvent {
  const e = db.events.find((x) => x.slug === slug);
  if (!e) throw new ApiRequestError(404, "not_found", "We couldn’t find that gathering.");
  return toEvent(db, reconcile(db, e));
}

const demoFirst = (a: GatheringEvent, b: GatheringEvent) => Number(b.slug === DEMO_SLUG) - Number(a.slug === DEMO_SLUG);

function attendeesCsv(db: Db, slug: string): string {
  const e = db.events.find((x) => x.slug === slug && x.organizerId === ORGANIZER);
  if (!e) throw new ApiRequestError(404, "not_found", "No launch with that address in your workspace.");
  // neutralize spreadsheet formula prefixes in user-entered cells
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const price = (e.priceCents / 100).toFixed(2);
  const people = db.commitments.filter((c) => c.eventId === e.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const lines = [
    ["Name", "Email", "Demo commitment (USD)", "Committed at (UTC)", "Status"].map(cell).join(","),
    ...people.map((p) =>
      [p.name, p.email, price, p.createdAt, e.status === "confirmed" ? "Confirmed" : "Committed"].map(cell).join(","),
    ),
  ];
  return lines.join("\r\n") + "\r\n";
}

function join(db: Db, slug: string, input: JoinInput): JoinResult {
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  const email = String(input.email ?? "").trim().toLowerCase();
  const key = String(input.idempotencyKey ?? "").trim();
  const fields: Record<string, string> = {};
  if (name.length < 2 || name.length > 60) fields.name = "Add your name (2–60 characters).";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) fields.email = "Use a valid email address.";
  if (key.length < 8 || key.length > 100) fields.idempotencyKey = "Missing request key.";
  if (Object.keys(fields).length) throw new ApiRequestError(422, "invalid", "Check the highlighted fields.", fields);

  // Retried request? Return the original outcome.
  const prior = db.commitments.find((c) => c.key === key);
  if (prior) {
    const ev = db.events.find((e) => e.id === prior.eventId);
    if (ev?.slug !== slug) throw new ApiRequestError(422, "invalid", "Request key reused for another gathering.");
    return { event: getEventSync(db, slug), commitmentId: prior.id, reachedQuorum: false, replayed: true };
  }

  const ev = db.events.find((e) => e.slug === slug);
  if (!ev) throw new ApiRequestError(404, "not_found", "We couldn’t find that gathering.");
  if (ev.status === "collecting" && Date.parse(ev.deadline) <= Date.now()) {
    reconcile(db, ev);
    throw new ApiRequestError(410, "expired", "Commitments for this gathering have closed.");
  }
  if (db.commitments.some((c) => c.eventId === ev.id && c.email === email))
    throw new ApiRequestError(409, "duplicate", "That email already holds a seat at this gathering.");
  if (ev.status === "confirmed")
    throw new ApiRequestError(409, "confirmed", "Quorum was already reached — this gathering is confirmed and closed.");
  if (ev.status === "expired") throw new ApiRequestError(410, "expired", "Commitments for this gathering have closed.");

  const count = db.commitments.filter((c) => c.eventId === ev.id).length;
  if (count >= ev.capacity) throw new ApiRequestError(409, "full", "Every seat is taken.");

  const now = Date.now();
  const id = commit(db, ev.id, name, email, now, key);
  log(db, ev.id, "committed", name, now);
  let reachedQuorum = false;
  if (count + 1 >= ev.minimumPeople) {
    ev.status = "confirmed";
    log(db, ev.id, "confirmed", null, now);
    reachedQuorum = true;
  }
  save(db);
  return { event: getEventSync(db, slug), commitmentId: id, reachedQuorum, replayed: false };
}

function create(db: Db, input: CreateEventInput): GatheringEvent {
  const fields: Record<string, string> = {};
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  const location = String(input.location ?? "").trim();
  const timezone = input.timezone || LA;
  const category: Category = (["workshop", "meetup", "creative"] as const).includes(input.category)
    ? input.category
    : "workshop";
  const price = Number(input.priceDollars);
  const min = Number(input.minimumPeople);

  if (title.length < 3 || title.length > 70) fields.title = "Name it in 3–70 characters.";
  if (description.length < 8 || description.length > 200) fields.description = "Describe it in 8–200 characters.";
  if (location.length < 2 || location.length > 60) fields.location = "Where is it? (2–60 characters)";
  if (input.demoCommitments && (!Number.isInteger(price) || price < 1 || price > 500))
    fields.priceDollars = "Whole dollars between $1 and $500.";
  if (!Number.isInteger(min) || min < 2 || min > 50) fields.minimumPeople = "Between 2 and 50 people.";

  const start = zonedToUtc(input.date, input.time, timezone);
  const [dDate, dTime] = String(input.deadline ?? "").split("T");
  const deadline = zonedToUtc(dDate ?? "", (dTime ?? "").slice(0, 5), timezone);
  const now = Date.now();
  if (!start) fields.date = "Pick a date and time.";
  else if (start.getTime() < now + 30 * MIN) fields.date = "Start at least 30 minutes from now.";
  if (!deadline) fields.deadline = "Pick a deadline.";
  else if (deadline.getTime() <= now + 5 * MIN) fields.deadline = "Give people at least a few minutes.";
  else if (start && deadline.getTime() >= start.getTime()) fields.deadline = "The deadline must come before it starts.";
  if (Object.keys(fields).length) throw new ApiRequestError(422, "invalid", "A few details need attention.", fields);

  const base =
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40) || "gathering";
  let slug = base;
  while (db.events.some((e) => e.slug === slug)) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const id = uuid();
  db.events.push({
    id,
    slug,
    title,
    headline: headlineFor(title, description),
    description,
    category,
    startsAt: start!.toISOString(),
    timezone,
    durationMinutes: 60,
    location,
    deadline: deadline!.toISOString(),
    priceCents: input.demoCommitments ? price * 100 : 0,
    minimumPeople: min,
    capacity: min,
    status: "collecting",
    hostName: "Ashay",
    organizerId: ORGANIZER,
    scene: "seat",
    agenda: ["Arrive and settle in", "Do the thing together", "Leave with a next step"],
    isDemoFixture: false,
    createdAt: iso(now),
  });
  log(db, id, "created", "Ashay", now);
  save(db);
  return getEventSync(db, slug);
}

/** Run synchronously, resolve asynchronously, so callers see the same shape as the HTTP adapter. */
const run = <T>(fn: (db: Db) => T): Promise<T> => {
  try {
    return Promise.resolve(fn(load()));
  } catch (err) {
    return Promise.reject(err);
  }
};

export const browserAdapter: QuorumAdapter = {
  listEvents: ({ q = "", category = "" } = {}) =>
    run((db) => {
      const needle = q.trim().toLowerCase();
      return [...db.events]
        .sort((a, b) => Number(b.isDemoFixture) - Number(a.isDemoFixture) || a.startsAt.localeCompare(b.startsAt))
        .map((e) => toEvent(db, reconcile(db, e)))
        .filter((e) => !category || category === "all" || e.category === category)
        .filter(
          (e) =>
            !needle ||
            [e.title, e.description, e.location, e.hostName, e.category].some((f) => f.toLowerCase().includes(needle)),
        )
        .sort(demoFirst);
    }),
  getEvent: (slug) => run((db) => getEventSync(db, slug)),
  createEvent: (input) => run((db) => create(db, input)),
  join: (slug, input) => run((db) => join(db, slug, input)),
  listLaunches: () =>
    run((db): Launch[] =>
      db.events
        .filter((e) => e.organizerId === ORGANIZER)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((e) => toEvent(db, reconcile(db, e)))
        .sort(demoFirst)
        .map((event) => ({
          event,
          activity: structuredClone(
            db.activity.filter((a) => a.eventId === event.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
          ),
        })),
    ),
  attendeesCsvUrl: (slug) => {
    try {
      return `data:text/csv;charset=utf-8,${encodeURIComponent(attendeesCsv(load(), slug))}`;
    } catch {
      return "#";
    }
  },
  resetDemo: () =>
    run((db) => {
      resetDemoIn(db);
      save(db);
      return getEventSync(db, DEMO_SLUG);
    }),
};
