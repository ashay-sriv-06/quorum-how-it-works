/**
 * Demo content shared by the SQLite store (server/store.ts) and the in-browser
 * store used for static hosting (src/data/browserStore.ts).
 */
import type { Category, EventStatus, SceneKey } from "./types.js";
import { utcToZoned, zonedToUtc } from "./time.js";

export const DEMO_SLUG = "portfolio-night";
export const ORGANIZER = "demo-organizer";
export const LA = "America/Los_Angeles";
export const MIN = 60_000;
export const DAY = 24 * 60 * MIN;

export const DEMO_EVENT = {
  title: "AI Portfolio Night",
  headline: "One seat. A better portfolio.",
  description:
    "Bring your portfolio. Leave with a sharper story. Three people, thirty minutes, honest feedback on the work you’re proudest of.",
  agenda: ["Share your work", "Get honest feedback", "Leave with your next move"],
};

/** A short description reads as a headline ("Bring one page. Leave with three edits."); otherwise the title. */
export function headlineFor(title: string, description: string) {
  const d = description.replace(/\s+/g, " ").trim();
  if (d.length <= 64) return /[.!?]$/.test(d) ? d : `${d}.`;
  const first = d.match(/^[^.!?]{3,60}[.!?]/)?.[0];
  return first ?? (/[.!?]$/.test(title) ? title : `${title}.`);
}

export function demoStart(): Date {
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

export type Fixture = {
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

export const FIXTURES: Fixture[] = [
  {
    slug: "sunday-photo-walk",
    title: "Sunday Photo Walk",
    headline: "Six lenses. One city.",
    description:
      "A slow two-hour walk through the Financial District at golden hour. Bring any camera; leave with a roll worth printing.",
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
    description:
      "Two focused hours of heads-down building with a small table of makers, then ten minutes each to demo.",
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
