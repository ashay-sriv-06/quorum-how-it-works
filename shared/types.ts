export type EventStatus = "collecting" | "confirmed" | "expired";
export type Category = "workshop" | "meetup" | "creative";
export type SceneKey = "seat" | "seat-close" | "table" | "circle" | "circle-wide" | "walk" | "brew";

/** Public participant: never carries an email. */
export interface Participant {
  id: string;
  name: string;
  createdAt: string;
}

export interface GatheringEvent {
  id: string;
  slug: string;
  title: string;
  headline: string;
  description: string;
  category: Category;
  startsAt: string; // ISO UTC
  timezone: string; // IANA
  durationMinutes: number;
  location: string;
  deadline: string; // ISO UTC, precedes startsAt
  priceCents: number;
  minimumPeople: number;
  capacity: number;
  status: EventStatus;
  hostName: string;
  scene: SceneKey;
  agenda: string[];
  isDemoFixture: boolean;
  createdAt: string;
  participants: Participant[];
}

export type ActivityType = "created" | "committed" | "confirmed" | "expired" | "reset";

export interface Activity {
  id: string;
  eventId: string;
  type: ActivityType;
  actorName: string | null;
  createdAt: string;
}

export interface Launch {
  event: GatheringEvent;
  activity: Activity[];
}

export interface CreateEventInput {
  title: string;
  description: string;
  category: Category;
  date: string; // yyyy-mm-dd, organizer's local wall time
  time: string; // HH:mm
  deadline: string; // yyyy-mm-ddTHH:mm
  timezone: string;
  location: string;
  priceDollars: number;
  minimumPeople: number;
  demoCommitments: boolean;
}

export interface JoinInput {
  name: string;
  email: string;
  idempotencyKey: string;
}

export interface JoinResult {
  event: GatheringEvent;
  commitmentId: string;
  /** true when this very commitment flipped the event to confirmed */
  reachedQuorum: boolean;
  replayed: boolean;
}

export type ApiErrorCode =
  | "not_found"
  | "invalid"
  | "duplicate"
  | "full"
  | "expired"
  | "confirmed"
  | "server";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; fields?: Record<string, string> };
}
