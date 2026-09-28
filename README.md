# Quorum

Small gatherings that only become real when enough people commit. The demo story is
**AI Portfolio Night**: three seats, $5 each, Maya and Jordan already in, one seat left.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:lan    # same, exposed on your LAN for the phone-to-laptop demo
```

The API runs inside the Vite server (`server/api.ts`), backed by SQLite at `data/quorum.db`
(Node's built-in `node:sqlite`, so there's nothing extra to install). The database seeds
itself on the first request. Use **Demo mode → Reset AI Portfolio Night** in the header to
restore Maya and Jordan and open a fresh 45-minute window.

Other scripts: `npm run build`, `npm run preview` (preview also serves the API),
`npm run typecheck`, `npm run assets` (regenerates the photo plates and chair traces
from the reference PNGs; needs Python 3 with OpenCV and NumPy).

## Deploy (Vercel)

Live at **https://quorum-psi-henna.vercel.app**. The static site is built by Vite. `api/quorum.ts`
wraps the same `server/api.ts` as a Vercel Function; `vercel.json` rewrites `/api/*` to it and
sends every other path to the SPA.

Redeploy with `npx vercel deploy` (preview) or `npx vercel deploy --prod`.

> **Temporary storage.** On Vercel, SQLite lives in the function's `/tmp`. State is shared while
> an instance stays warm, but it can fall back to the seeded demo after idle periods or a new
> deploy. For durable shared state, move `server/store.ts` to a Marketplace Postgres (for
> example Neon). The adapter interface doesn't change.

## Demo path

1. `/` — the live card shows 02/03. Choose **Take the third seat**.
2. `/g/portfolio-night` — choose **Fill demo visitor** (Alex Rivera), then **I'm in — $5**.
   The row enters, the counter rolls to 03, the last segment fills, a cobalt sweep crosses the
   panel, the check draws, and the headline becomes "It's happening." You're then taken to
3. `/g/portfolio-night/confirmed` — **Add to calendar** downloads a valid `.ics` file.
4. `/my-launches` — the participants, $15 in demo commitments, the real activity timeline,
   **Download attendee list** (CSV) and **Copy invite link**.

Open the site in a second browser (or on your phone). The other session updates within 2 seconds.

## Structure

| Path | What |
|---|---|
| `shared/` | Types and time-zone helpers shared by client and server |
| `server/store.ts` | Schema, fixtures, and the join transaction (the single source of truth) |
| `server/api.ts` | `/api/*` routes, mounted by `vite.config.ts` |
| `src/data/adapter.ts` | **The one typed data adapter.** Swap `httpAdapter` to rewire to a real backend |
| `src/scene/` | `Scene`: one reusable component for photo plates, the chair trace, markers, parallax and the entrance veil |
| `src/components/` | Header, buttons, event cards, segmented progress, rolling counter, people, toast |
| `src/pages/` | Home, Explore, Create, EventPage, Confirmed, MyLaunches, HowItWorks |
| `scripts/` | Asset pipeline: cuts clean plates from the mockups, inpaints the baked-in UI text, and splits the cobalt chair into its own traced layer |

## Implemented vs simulated

**Real**
- Shared persistent store. The join is one `BEGIN IMMEDIATE` transaction that checks status,
  deadline and capacity, inserts the commitment, then flips the event to confirmed at quorum.
- `(event, normalized email)` uniqueness. Retries with the same idempotency key replay the
  original result. Duplicate, full, expired and already-confirmed joins get specific messages
  and no success animation.
- Expiry is reconciled on read and on join. A confirmed event stays confirmed past its deadline.
- Validation on both client and server: name, email, whole-dollar price, participant count,
  dates, and a deadline that must come before the start. Times are entered in the organizer's
  own time zone.
- Emails never appear in public reads. The CSV neutralizes spreadsheet formula prefixes.
- Counters, totals, segments, countdowns and the timeline are all derived from stored data.
  Animations run once per real state transition, and a reload shows the settled state.
- Create: live preview, local draft autosave plus **Save draft**, and publish to a new URL.
- `prefers-reduced-motion` removes the parallax, trace, rolling and sweep animations.

**Simulated**
- Payments. Every figure is labeled a *demo commitment*. No card is charged or authorized.
- Notifications. None are sent, and the UI doesn't claim otherwise.
- Identity. "You're in" is remembered per browser in `localStorage`. The organizer view is a
  fictional demo workspace with no authentication, so don't put real people's data in it.
- Photography. The plates are cut from generated concept images, and the people are decorative.
