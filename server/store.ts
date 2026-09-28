import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Activity,
  ActivityType,
  ApiErrorCode,
  Category,
  CreateEventInput,
  EventStatus,
  GatheringEvent,
  JoinInput,
  JoinResult,
  Launch,
  SceneKey,
} from "../shared/types.js";
import { zonedToUtc, utcToZoned } from "../shared/time.js";

export const DEMO_SLUG = "portfolio-night";
const ORGANIZER = "demo-organizer";
const LA = "America/Los_Angeles";
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** A short description reads as a headline ("Bring one page. Leave with three edits."); otherwise the title. */
function headlineFor(title: string, description: string) {
  const d = description.replace(/\s+/g, " ").trim();
  if (d.length <= 64) return /[.!?]$/.test(d) ? d : `${d}.`;
  const first = d.match(/^[^.!?]{3,60}[.!?]/)?.[0];
  return first ?? (/[.!?]$/.test(title) ? title : `${title}.`);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

type Row = Record<string, string | number | null>;

export function openStore(file: string) {
  mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      headline TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      timezone TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      location TEXT NOT NULL,
      deadline TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      minimum_people INTEGER NOT NULL,
      capacity INTEGER NOT NULL,
      status TEXT NOT NULL,
      host_name TEXT NOT NULL,
      organizer_id TEXT,
      scene TEXT NOT NULL,
      agenda TEXT NOT NULL,
      is_demo_fixture INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS commitments (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      normalized_email TEXT NOT NULL,
      idempotency_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      UNIQUE (event_id, normalized_email)
    );
    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      actor_name TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const tx = <T>(fn: () => T): T => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const out = fn();
      db.exec("COMMIT");
      return out;
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  };

  const iso = (ms: number) => new Date(ms).toISOString();

  const logActivity = (eventId: string, type: ActivityType, actor: string | null, at: number) =>
    db
      .prepare("INSERT INTO activity (id, event_id, type, actor_name, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(randomUUID(), eventId, type, actor, iso(at));

  const insertCommitment = (eventId: string, name: string, email: string, at: number, key: string | null) =>
    db
      .prepare(
        "INSERT INTO commitments (id, event_id, name, normalized_email, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(randomUUID(), eventId, name, email, key, iso(at));

  // ---------------------------------------------------------------- reads

  const participantsOf = (eventId: string) =>
    (db
      .prepare("SELECT id, name, created_at FROM commitments WHERE event_id = ? ORDER BY created_at, rowid")
      .all(eventId) as Row[]).map((r) => ({ id: String(r.id), name: String(r.name), createdAt: String(r.created_at) }));

  const toEvent = (r: Row): GatheringEvent => ({
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    headline: String(r.headline),
    description: String(r.description),
    category: r.category as Category,
    startsAt: String(r.starts_at),
    timezone: String(r.timezone),
    durationMinutes: Number(r.duration_minutes),
    location: String(r.location),
    deadline: String(r.deadline),
    priceCents: Number(r.price_cents),
    minimumPeople: Number(r.minimum_people),
    capacity: Number(r.capacity),
    status: r.status as EventStatus,
    hostName: String(r.host_name),
    scene: r.scene as SceneKey,
    agenda: JSON.parse(String(r.agenda)),
    isDemoFixture: Boolean(r.is_demo_fixture),
    createdAt: String(r.created_at),
    participants: participantsOf(String(r.id)),
  });

  /** A collecting event whose deadline passed becomes expired, on read. */
  const reconcile = (r: Row): Row => {
    if (r.status === "collecting" && Date.parse(String(r.deadline)) <= Date.now()) {
      tx(() => {
        const res = db
          .prepare("UPDATE events SET status = 'expired' WHERE id = ? AND status = 'collecting'")
          .run(String(r.id));
        if (res.changes) logActivity(String(r.id), "expired", null, Date.parse(String(r.deadline)));
      });
      return { ...r, status: "expired" };
    }
    return r;
  };

  const rowBySlug = (slug: string) => db.prepare("SELECT * FROM events WHERE slug = ?").get(slug) as Row | undefined;

  function getEvent(slug: string): GatheringEvent {
    const row = rowBySlug(slug);
    if (!row) throw new ApiError(404, "not_found", "We couldn’t find that gathering.");
    return toEvent(reconcile(row));
  }

  function listEvents(q = "", category = ""): GatheringEvent[] {
    const rows = db.prepare("SELECT * FROM events ORDER BY is_demo_fixture DESC, starts_at").all() as Row[];
    const needle = q.trim().toLowerCase();
    return rows
      .map((r) => toEvent(reconcile(r)))
      .filter((e) => !category || category === "all" || e.category === category)
      .filter(
        (e) =>
          !needle ||
          [e.title, e.description, e.location, e.hostName, e.category].some((f) => f.toLowerCase().includes(needle)),
      )
      .sort((a, b) => Number(b.slug === DEMO_SLUG) - Number(a.slug === DEMO_SLUG));
  }

  function listLaunches(): Launch[] {
    const rows = db
      .prepare("SELECT * FROM events WHERE organizer_id = ? ORDER BY created_at DESC")
      .all(ORGANIZER) as Row[];
    return rows
      .map((r) => toEvent(reconcile(r)))
      .sort((a, b) => Number(b.slug === DEMO_SLUG) - Number(a.slug === DEMO_SLUG))
      .map((event) => ({
        event,
        activity: (db
          .prepare("SELECT * FROM activity WHERE event_id = ? ORDER BY created_at, rowid")
          .all(event.id) as Row[]).map(
          (a): Activity => ({
            id: String(a.id),
            eventId: String(a.event_id),
            type: a.type as ActivityType,
            actorName: a.actor_name === null ? null : String(a.actor_name),
            createdAt: String(a.created_at),
          }),
        ),
      }));
  }

  function attendeesCsv(slug: string): string {
    const row = db.prepare("SELECT * FROM events WHERE slug = ? AND organizer_id = ?").get(slug, ORGANIZER) as
      | Row
      | undefined;
    if (!row) throw new ApiError(404, "not_found", "No launch with that address in your workspace.");
    const people = db
      .prepare("SELECT name, normalized_email, created_at FROM commitments WHERE event_id = ? ORDER BY created_at")
      .all(String(row.id)) as Row[];
    // neutralize spreadsheet formula prefixes in user-entered cells
    const cell = (v: unknown) => {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const price = (Number(row.price_cents) / 100).toFixed(2);
    const lines = [
      ["Name", "Email", "Demo commitment (USD)", "Committed at (UTC)", "Status"].map(cell).join(","),
      ...people.map((p) =>
        [p.name, p.normalized_email, price, p.created_at, row.status === "confirmed" ? "Confirmed" : "Committed"]
          .map(cell)
          .join(","),
      ),
    ];
    return lines.join("\r\n") + "\r\n";
  }

  // ---------------------------------------------------------------- writes

  function join(slug: string, input: JoinInput): JoinResult {
    const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
    const email = String(input.email ?? "").trim().toLowerCase();
    const key = String(input.idempotencyKey ?? "").trim();
    const fields: Record<string, string> = {};
    if (name.length < 2 || name.length > 60) fields.name = "Add your name (2–60 characters).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) fields.email = "Use a valid email address.";
    if (key.length < 8 || key.length > 100) fields.idempotencyKey = "Missing request key.";
    if (Object.keys(fields).length) throw new ApiError(422, "invalid", "Check the highlighted fields.", fields);

    const result = tx(() => {
      // Retried request? Return the original outcome.
      const prior = db
        .prepare(
          "SELECT c.id, e.slug FROM commitments c JOIN events e ON e.id = c.event_id WHERE c.idempotency_key = ?",
        )
        .get(key) as Row | undefined;
      if (prior) {
        if (prior.slug !== slug) throw new ApiError(422, "invalid", "Request key reused for another gathering.");
        return { commitmentId: String(prior.id), reachedQuorum: false, replayed: true, expiredNow: false };
      }

      const ev = rowBySlug(slug);
      if (!ev) throw new ApiError(404, "not_found", "We couldn’t find that gathering.");
      const eventId = String(ev.id);

      if (ev.status === "collecting" && Date.parse(String(ev.deadline)) <= Date.now()) {
        db.prepare("UPDATE events SET status = 'expired' WHERE id = ?").run(eventId);
        logActivity(eventId, "expired", null, Date.parse(String(ev.deadline)));
        return { expiredNow: true } as const;
      }

      const dup = db
        .prepare("SELECT id FROM commitments WHERE event_id = ? AND normalized_email = ?")
        .get(eventId, email) as Row | undefined;
      if (dup) throw new ApiError(409, "duplicate", "That email already holds a seat at this gathering.");
      if (ev.status === "confirmed")
        throw new ApiError(409, "confirmed", "Quorum was already reached — this gathering is confirmed and closed.");
      if (ev.status === "expired") throw new ApiError(410, "expired", "Commitments for this gathering have closed.");

      const count = Number(
        (db.prepare("SELECT COUNT(*) AS n FROM commitments WHERE event_id = ?").get(eventId) as Row).n,
      );
      if (count >= Number(ev.capacity)) throw new ApiError(409, "full", "Every seat is taken.");

      const now = Date.now();
      const id = randomUUID();
      db.prepare(
        "INSERT INTO commitments (id, event_id, name, normalized_email, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(id, eventId, name, email, key, iso(now));
      logActivity(eventId, "committed", name, now);

      let reachedQuorum = false;
      if (count + 1 >= Number(ev.minimum_people)) {
        db.prepare("UPDATE events SET status = 'confirmed' WHERE id = ?").run(eventId);
        logActivity(eventId, "confirmed", null, now);
        reachedQuorum = true;
      }
      return { commitmentId: id, reachedQuorum, replayed: false, expiredNow: false };
    });

    if (result.expiredNow) throw new ApiError(410, "expired", "Commitments for this gathering have closed.");
    return { event: getEvent(slug), commitmentId: result.commitmentId, reachedQuorum: result.reachedQuorum, replayed: result.replayed };
  }

  function create(input: CreateEventInput): GatheringEvent {
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
    if (Object.keys(fields).length) throw new ApiError(422, "invalid", "A few details need attention.", fields);

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
    while (rowBySlug(slug)) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

    const id = randomUUID();
    tx(() => {
      db.prepare(
        `INSERT INTO events (id, slug, title, headline, description, category, starts_at, timezone, duration_minutes,
          location, deadline, price_cents, minimum_people, capacity, status, host_name, organizer_id, scene, agenda,
          is_demo_fixture, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'collecting', ?, ?, 'seat', ?, 0, ?)`,
      ).run(
        id,
        slug,
        title,
        headlineFor(title, description),
        description,
        category,
        start!.toISOString(),
        timezone,
        60,
        location,
        deadline!.toISOString(),
        input.demoCommitments ? price * 100 : 0,
        min,
        min,
        "Ashay",
        ORGANIZER,
        JSON.stringify(["Arrive and settle in", "Do the thing together", "Leave with a next step"]),
        iso(now),
      );
      logActivity(id, "created", "Ashay", now);
    });
    return getEvent(slug);
  }

  // ---------------------------------------------------------------- fixtures

  function demoStart(): Date {
    const fixed = zonedToUtc("2026-09-29", "18:00", LA)!;
    if (fixed.getTime() > Date.now() + 2 * 60 * MIN) return fixed;
    // the canonical date has passed: roll to the next 6 PM PT at least 2h out
    let d = new Date(Date.now() + 2 * 60 * MIN);
    for (;;) {
      const { date } = utcToZoned(d, LA);
      const candidate = zonedToUtc(date, "18:00", LA)!;
      if (candidate.getTime() > Date.now() + 2 * 60 * MIN) return candidate;
      d = new Date(d.getTime() + DAY);
    }
  }

  function resetDemo() {
    const now = Date.now();
    const start = demoStart();
    const deadline = Math.min(now + 45 * MIN, start.getTime() - 30 * MIN);
    tx(() => {
      const existing = rowBySlug(DEMO_SLUG);
      if (existing) db.prepare("DELETE FROM events WHERE id = ?").run(String(existing.id));
      const id = randomUUID();
      db.prepare(
        `INSERT INTO events (id, slug, title, headline, description, category, starts_at, timezone, duration_minutes,
          location, deadline, price_cents, minimum_people, capacity, status, host_name, organizer_id, scene, agenda,
          is_demo_fixture, created_at)
         VALUES (?, ?, ?, ?, ?, 'workshop', ?, ?, 30, 'Online', ?, 500, 3, 3, 'collecting', 'Ashay', ?, 'seat', ?, 1, ?)`,
      ).run(
        id,
        DEMO_SLUG,
        "AI Portfolio Night",
        "One seat. A better portfolio.",
        "Bring your portfolio. Leave with a sharper story. Three people, thirty minutes, honest feedback on the work you’re proudest of.",
        start.toISOString(),
        LA,
        iso(deadline),
        ORGANIZER,
        JSON.stringify(["Share your work", "Get honest feedback", "Leave with your next move"]),
        iso(now - 12 * MIN),
      );
      logActivity(id, "created", "Ashay", now - 12 * MIN);
      insertCommitment(id, "Maya Chen", "maya.chen@example.com", now - 9 * MIN, null);
      logActivity(id, "committed", "Maya Chen", now - 9 * MIN);
      insertCommitment(id, "Jordan Lee", "jordan.lee@example.com", now - 7 * MIN, null);
      logActivity(id, "committed", "Jordan Lee", now - 7 * MIN);
    });
  }

  function seedFixtures() {
    const now = Date.now();
    type Fx = {
      slug: string;
      title: string;
      headline: string;
      description: string;
      category: Category;
      date: string;
      time: string;
      duration: number;
      location: string;
      deadlineDays: number;
      price: number;
      min: number;
      cap: number;
      status: EventStatus;
      host: string;
      scene: SceneKey;
      agenda: string[];
      people: string[];
    };
    const fixtures: Fx[] = [
      {
        slug: "sunday-photo-walk",
        title: "Sunday Photo Walk",
        headline: "Six lenses. One city.",
        description: "A slow two-hour walk through the Financial District at golden hour. Bring any camera; leave with a roll worth printing.",
        category: "creative",
        date: "2026-10-04",
        time: "16:30",
        duration: 120,
        location: "San Francisco",
        deadlineDays: 4,
        price: 10,
        min: 6,
        cap: 6,
        status: "collecting",
        host: "Priya N.",
        scene: "walk",
        agenda: ["Meet at the cable car turnaround", "Shoot the light as it drops", "Swap favorite frames"],
        people: ["Theo Park", "Ines Duarte", "Sam Okafor", "Lena Voss"],
      },
      {
        slug: "build-and-brew",
        title: "Build & Brew",
        headline: "Ship something before the coffee cools.",
        description: "Two focused hours of heads-down building with a small table of makers, then ten minutes each to demo.",
        category: "meetup",
        date: "2026-10-03",
        time: "10:00",
        duration: 120,
        location: "Oakland",
        deadlineDays: 3,
        price: 8,
        min: 5,
        cap: 5,
        status: "collecting",
        host: "Marcus B.",
        scene: "brew",
        agenda: ["Set a two-hour goal", "Build in silence", "Demo to the table"],
        people: ["Ren Ito", "Dana Wolfe", "Kofi Mensah"],
      },
      {
        slug: "pitch-practice-circle",
        title: "Pitch Practice Circle",
        headline: "Say it out loud before it counts.",
        description: "Four founders, four five-minute pitches, and the kind of feedback you can only get in a small room.",
        category: "workshop",
        date: "2026-10-06",
        time: "19:00",
        duration: 90,
        location: "Berkeley",
        deadlineDays: 5,
        price: 12,
        min: 4,
        cap: 4,
        status: "collecting",
        host: "Elena R.",
        scene: "table",
        agenda: ["Pitch in five minutes", "Hear what landed", "Rewrite one slide together"],
        people: ["Omar Haddad", "June Park"],
      },
      {
        slug: "design-crit-club",
        title: "Design Crit Club",
        headline: "Three designers. No polite feedback.",
        description: "A standing monthly crit for product designers. Show one screen you’re stuck on; leave unstuck.",
        category: "creative",
        date: "2026-10-01",
        time: "18:30",
        duration: 60,
        location: "Online",
        deadlineDays: 1,
        price: 6,
        min: 3,
        cap: 3,
        status: "confirmed",
        host: "Noah K.",
        scene: "circle-wide",
        agenda: ["Show the stuck screen", "Three rounds of crit", "Commit to one change"],
        people: ["Aria Singh", "Ben Carter", "Mei Tan"],
      },
    ];
    tx(() => {
      for (const f of fixtures) {
        const id = randomUUID();
        const start = zonedToUtc(f.date, f.time, LA)!;
        let startMs = start.getTime();
        // keep fixtures in the future if the demo is run later
        while (startMs < now + 2 * DAY) startMs += 7 * DAY;
        const deadline = Math.min(now + f.deadlineDays * DAY, startMs - 60 * MIN);
        db.prepare(
          `INSERT INTO events (id, slug, title, headline, description, category, starts_at, timezone, duration_minutes,
            location, deadline, price_cents, minimum_people, capacity, status, host_name, organizer_id, scene, agenda,
            is_demo_fixture, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 1, ?)`,
        ).run(
          id,
          f.slug,
          f.title,
          f.headline,
          f.description,
          f.category,
          iso(startMs),
          LA,
          f.duration,
          f.location,
          iso(deadline),
          f.price * 100,
          f.min,
          f.cap,
          f.status,
          f.host,
          f.scene,
          JSON.stringify(f.agenda),
          iso(now - 3 * DAY),
        );
        f.people.forEach((p, i) => {
          const at = now - (2 * DAY - i * 3 * 60 * MIN);
          insertCommitment(id, p, `${p.toLowerCase().replace(/\W+/g, ".")}@example.com`, at, null);
        });
      }
    });
  }

  const count = Number((db.prepare("SELECT COUNT(*) AS n FROM events").get() as Row).n);
  if (count === 0) {
    seedFixtures();
    resetDemo();
  }

  return { getEvent, listEvents, listLaunches, attendeesCsv, join, create, resetDemo };
}

export type Store = ReturnType<typeof openStore>;
