import type { GatheringEvent } from "../../shared/types";
import { utcToZoned } from "../../shared/time";

export const money = (cents: number) =>
  cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;

export const pad2 = (n: number) => String(Math.max(0, n)).padStart(2, "0");

export function tzAbbr(iso: string, timeZone: string) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
    .formatToParts(new Date(iso))
    .find((p) => p.type === "timeZoneName")?.value;
  // "PDT"/"PST" read as "PT" in the design
  return part?.replace(/^P[DS]T$/, "PT").replace(/^E[DS]T$/, "ET").replace(/^C[DS]T$/, "CT") ?? "";
}

export function timeLabel(iso: string, timeZone: string) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(d);
  return f.replace(/ /g, " ").replace(":00", "");
}

export function dateLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(new Date(iso));
}

/** "Sep 29 · 6 PM PT" */
export function whenLabel(e: Pick<GatheringEvent, "startsAt" | "timezone">) {
  return `${dateLabel(e.startsAt, e.timezone)} · ${timeLabel(e.startsAt, e.timezone)} ${tzAbbr(e.startsAt, e.timezone)}`;
}

/** "Tomorrow, 6 PM" / "Sat, 10 AM" / "Oct 12, 6 PM" relative to now in the event's zone. */
export function relativeWhen(e: Pick<GatheringEvent, "startsAt" | "timezone">, now = Date.now()) {
  const { date } = utcToZoned(e.startsAt, e.timezone);
  const today = utcToZoned(new Date(now), e.timezone).date;
  const tomorrow = utcToZoned(new Date(now + 86_400_000), e.timezone).date;
  const t = timeLabel(e.startsAt, e.timezone);
  if (date === today) return `Today, ${t}`;
  if (date === tomorrow) return `Tomorrow, ${t}`;
  const days = (Date.parse(e.startsAt) - now) / 86_400_000;
  if (days > 0 && days < 6) {
    const wd = new Intl.DateTimeFormat("en-US", { timeZone: e.timezone, weekday: "short" }).format(new Date(e.startsAt));
    return `${wd}, ${t}`;
  }
  return `${dateLabel(e.startsAt, e.timezone)}, ${t}`;
}

export function durationLabel(min: number) {
  if (min < 60) return `${min} minutes`;
  const h = min / 60;
  return Number.isInteger(h) ? `${h} hour${h > 1 ? "s" : ""}` : `${h.toFixed(1)} hours`;
}
export const shortDuration = (min: number) => (min < 60 ? `${min} min` : `${+(min / 60).toFixed(1)} hr`);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export const firstName = (name: string) => name.split(/\s+/)[0] ?? name;

export function listNames(names: string[]) {
  const f = names.map(firstName);
  if (f.length === 0) return "";
  if (f.length === 1) return f[0]!;
  if (f.length === 2) return `${f[0]} and ${f[1]}`;
  if (f.length === 3) return `${f[0]}, ${f[1]} and ${f[2]}`;
  return `${f[0]}, ${f[1]} and ${f.length - 2} others`;
}

export const numberWord = (n: number) =>
  ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][n] ?? String(n);

export function progressOf(e: GatheringEvent) {
  const count = e.participants.length;
  const remaining = Math.max(0, e.minimumPeople - count);
  return { count, remaining, total: e.minimumPeople, committedCents: count * e.priceCents, goalCents: e.minimumPeople * e.priceCents };
}

export const categoryLabel = { workshop: "Workshop", meetup: "Meetup", creative: "Creative" } as const;
