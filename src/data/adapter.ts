/**
 * The single seam between UI and data. Everything the UI reads or writes goes
 * through `adapter`. Today it talks to the local shared store (/api, seeded with
 * demo fixtures from server/store.ts); swap `httpAdapter` for a production
 * backend client with the same interface.
 */
import type {
  ApiErrorBody,
  ApiErrorCode,
  CreateEventInput,
  GatheringEvent,
  JoinInput,
  JoinResult,
  Launch,
} from "../../shared/types";
import { browserAdapter } from "./browserStore";

export interface QuorumAdapter {
  listEvents(params?: { q?: string; category?: string }): Promise<GatheringEvent[]>;
  getEvent(slug: string): Promise<GatheringEvent>;
  createEvent(input: CreateEventInput): Promise<GatheringEvent>;
  join(slug: string, input: JoinInput): Promise<JoinResult>;
  listLaunches(): Promise<Launch[]>;
  attendeesCsvUrl(slug: string): string;
  resetDemo(): Promise<GatheringEvent>;
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiRequestError(0, "server", "You appear to be offline. Try again in a moment.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiRequestError(res.status, err?.code ?? "server", err?.message ?? "Something went wrong.", err?.fields);
  }
  return body as T;
}

export const httpAdapter: QuorumAdapter = {
  listEvents: ({ q = "", category = "" } = {}) =>
    request(`/api/events?${new URLSearchParams({ q, category }).toString()}`),
  getEvent: (slug) => request(`/api/events/${encodeURIComponent(slug)}`),
  createEvent: (input) => request("/api/events", { method: "POST", body: JSON.stringify(input) }),
  join: (slug, input) =>
    request(`/api/events/${encodeURIComponent(slug)}/commitments`, { method: "POST", body: JSON.stringify(input) }),
  listLaunches: () => request("/api/launches"),
  attendeesCsvUrl: (slug) => `/api/launches/${encodeURIComponent(slug)}/attendees.csv`,
  resetDemo: () => request("/api/demo/reset", { method: "POST" }),
};

// Static hosting (GitHub Pages) has no /api: VITE_STATIC_DEMO swaps in the in-browser store.
export const adapter: QuorumAdapter = import.meta.env.VITE_STATIC_DEMO === "1" ? browserAdapter : httpAdapter;

/** Broadcast that shared data changed so every polled view refreshes now. */
export const DATA_CHANGED = "quorum:data-changed";
export const notifyDataChanged = () => window.dispatchEvent(new Event(DATA_CHANGED));
