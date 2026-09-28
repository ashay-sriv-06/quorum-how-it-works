import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { ApiError, openStore, type Store } from "./store.js";

type Next = (err?: unknown) => void;

let store: Store | null = null;
// Vercel functions only have writable /tmp (per instance, not durable); locally we keep data/quorum.db
const dbFile = () => (process.env.VERCEL ? "/tmp/quorum.db" : resolve(process.cwd(), "data", "quorum.db"));
const getStore = () => (store ??= openStore(dbFile()));

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  // Vercel's Node runtime may have already parsed the body for us
  const parsed = (req as IncomingMessage & { body?: unknown }).body;
  if (parsed && typeof parsed === "object" && !Buffer.isBuffer(parsed)) return parsed as Record<string, unknown>;
  if (typeof parsed === "string") {
    try {
      return parsed ? JSON.parse(parsed) : {};
    } catch {
      throw new ApiError(400, "invalid", "Malformed JSON.");
    }
  }
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 32_000) throw new ApiError(413, "invalid", "Request too large.");
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "invalid", "Malformed JSON.");
  }
}

/** Connect-style middleware serving /api/* from the shared SQLite store. */
export async function quorumApi(req: IncomingMessage, res: ServerResponse, next: Next) {
  const url = new URL(req.url ?? "/", "http://local");
  if (!url.pathname.startsWith("/api/")) return next();
  const parts = url.pathname.split("/").filter(Boolean).slice(1).map(decodeURIComponent);
  const method = req.method ?? "GET";
  const s = getStore();

  try {
    // GET /api/events
    if (method === "GET" && parts.length === 1 && parts[0] === "events") {
      return send(res, 200, s.listEvents(url.searchParams.get("q") ?? "", url.searchParams.get("category") ?? ""));
    }
    // POST /api/events
    if (method === "POST" && parts.length === 1 && parts[0] === "events") {
      return send(res, 201, s.create((await readJson(req)) as never));
    }
    // GET /api/events/:slug
    if (method === "GET" && parts.length === 2 && parts[0] === "events") {
      return send(res, 200, s.getEvent(parts[1]));
    }
    // POST /api/events/:slug/commitments
    if (method === "POST" && parts.length === 3 && parts[0] === "events" && parts[2] === "commitments") {
      const result = s.join(parts[1], (await readJson(req)) as never);
      return send(res, result.replayed ? 200 : 201, result);
    }
    // GET /api/launches
    if (method === "GET" && parts.length === 1 && parts[0] === "launches") {
      return send(res, 200, s.listLaunches());
    }
    // GET /api/launches/:slug/attendees.csv
    if (method === "GET" && parts.length === 3 && parts[0] === "launches" && parts[2] === "attendees.csv") {
      const csv = s.attendeesCsv(parts[1]);
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${parts[1]}-attendees.csv"`);
      res.setHeader("Cache-Control", "no-store");
      return res.end(csv);
    }
    // POST /api/demo/reset  (isolated demo dataset only)
    if (method === "POST" && parts.length === 2 && parts[0] === "demo" && parts[1] === "reset") {
      s.resetDemo();
      return send(res, 200, s.getEvent("portfolio-night"));
    }
    throw new ApiError(404, "not_found", "No such endpoint.");
  } catch (err) {
    if (err instanceof ApiError) {
      return send(res, err.status, { error: { code: err.code, message: err.message, fields: err.fields } });
    }
    console.error("[quorum api]", err);
    return send(res, 500, { error: { code: "server", message: "Something went wrong on our side." } });
  }
}
