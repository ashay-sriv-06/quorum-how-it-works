import type { IncomingMessage, ServerResponse } from "node:http";
import { quorumApi } from "../server/api.js";

/**
 * Vercel Function entry. vercel.json rewrites /api/<path> here as ?path=<path>;
 * restore the original URL and hand off to the same handler the dev server uses.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://local");
  const path = url.searchParams.get("path");
  if (path !== null) {
    url.searchParams.delete("path");
    const qs = url.searchParams.toString();
    req.url = `/api/${path}${qs ? `?${qs}` : ""}`;
  }
  await quorumApi(req, res, () => {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: { code: "not_found", message: "No such endpoint." } }));
  });
}
