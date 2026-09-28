# QUORUM — connected UI and motion handoff

Build a small, beautiful working prototype using the accompanying six page references. These are design concepts, not screenshots of implemented software. The video is a motion concept, not a working interface. Keep the product executable within one hour: real shared commitment state, simulated payments, no claim that notifications were sent.

## The story

An idea is an empty seat. Two people commit. One visitor becomes the third person who makes the gathering real. The organizer can see how it happened.

The shared event is **AI Portfolio Night**: $5 per person, three-person minimum and capacity, 30 minutes, online, September 29, 2026 at 6 PM America/Los_Angeles. Seed two clearly labeled demo participants, Maya Chen and Jordan Lee. The demo visitor is Alex Rivera. Use the same event ID on every route. Confirmation changes this event, rather than loading unrelated hardcoded success data.

The generated video conveys atmosphere and pacing only. It does not reliably update every label or total together. In the implementation, confirmation must simultaneously produce 3/3, $15 in demo commitments, all three filled segments, a stopped countdown, and a confirmed action state. Do not copy stale “one more person” copy, $10 totals, distorted labels, or an active join button from the video’s last frame. The confirmed-page PNG and server data define the correct final state.

## Routes and connections

| Reference | Route | Main purpose | Actions |
|---|---|---|---|
| 01 Home | `/` | Introduce the promise and the empty-seat metaphor | Start something → `/create`; Explore demo → `/explore`; featured seat → event |
| 02 Explore | `/explore` | Find a gathering worth joining | Featured event → `/g/portfolio-night`; filters and search work on seeded offers |
| 03 Create | `/create` | Turn an idea into a public invitation | Publish → new event URL; preview derives from current form values; drafts persist locally |
| 04 Event Join | `/g/:slug` | Explain the experience and accept a commitment | Join → save commitment; if quorum reached, show confirmation; otherwise stay with updated progress |
| 05 Confirmed | `/g/:slug/confirmed` | Celebrate the result and explain what happens next | Calendar downloads a valid .ics; View gathering → event page |
| 06 Organizer | `/my-launches` | Show participants and the actual activity history | Open event, copy invite, download attendee CSV, create next launch |

Global nav should be consistent across implementation: brand → Home, Explore, My launches, Create a launch. Use these labels even where a generated reference differs. All links must work. Other discovery offers are marked demo fixtures and use the same detail template.

## Design system

- Background `#080D10`, panels `#0D1419`, borders `#273139`.
- Text `#F2F4F5`, secondary text `#A4ADB5`, accent `#315BFF`.
- Thin regular-weight sans-serif headings; use Inter or an available equivalent. Headlines 64–76px desktop, 40–48px mobile. Body 16px; avoid tiny decorative text for important information.
- Monospaced, tabular numerals for counters and timestamps. Small uppercase labels have generous tracking.
- Buttons are rectangular, 4px radius, 44–48px minimum height. Avoid oversized rounded pills.
- Desktop maximum content width around 1440px, 56px gutters; mobile 20px gutters.
- Grayscale photographic halftone scenes with controlled blue annotations. Preserve deep shadows but make the empty chair and people visible. Ensure foreground text has a dark stable backing.
- Use the screenshots as composition references. Build all text, forms, counters, buttons and progress indicators as real HTML. Never use a whole screenshot as the interactive page.
- The photographic scene is decorative; it need not match participants' identities or the location of the online event. Blue SVG contours and leader lines convey the seat metaphor.
- The UI references are not exact specifications for numbers or progress geometry: render three equal progress segments, exactly two filled when the count is two, and all three when confirmed.

## Motion choreography

Use CSS and Motion if already available in the project. All motion is progressive enhancement and state-driven.

| Moment | Motion | Timing |
|---|---|---|
| First arrival | Background fades through a halftone veil; headline lines reveal from an 8px offset | 650ms background; 400ms text with 60ms stagger |
| Empty seat | One SVG stroke trace follows the chair contour; node emits two subtle ripples | 900ms trace; 600ms ripples |
| Scene depth | Optional desktop pointer parallax on the decorative image only | Maximum 6px; disable on touch/reduced motion |
| Button hover | Arrow translates 3px; background lightens slightly | 150ms |
| Button press | Scale 0.98, then return | 100ms |
| Explore card hover | Photograph scales to 1.025 inside its clipped bounds; blue invitation arrow appears | 250ms |
| Create preview | Text crossfades as valid form values change | 160ms; never move the focused input |
| Join accepted | Participant row enters, number rolls, next segment fills | 250ms row; 350ms number; 450ms segment |
| Quorum reached | Final segment fills → one cobalt sweep across panel → checkmark draws → headline becomes “It’s happening.” | Total 1.2s |
| Confirmation page | Three occupied seats fade in; thin blue connecting paths draw | 650ms; no looping confetti |
| Copy invite | Icon changes to check, label reads “Link copied” | 150ms transition; revert after 2s |
| Route change | Content fades with a 6px lift; header stays fixed | 180ms |

Use `cubic-bezier(0.22, 1, 0.36, 1)` for entrances and ease-out for controls. Animate transform/opacity wherever possible. The counter animation must reflect committed server data, never run an invented success sequence before the request succeeds. Animate only once for each actual state transition; page reloads show the correct settled state.

With `prefers-reduced-motion`, remove parallax, tracing, rolling and sweeping; update text/progress immediately with at most a short opacity transition. Never hijack scrolling or replace the cursor. No sound autoplay. Keep buttons clickable during decorative animation and provide visible keyboard focus.

## Minimum functional core

Reuse the existing project stack and database. If no backend exists, add the smallest shared persistent store available; browser localStorage alone is insufficient for the phone-to-laptop demo. Poll every two seconds instead of building a complex realtime transport.

Data: Event(id, slug, title, description, startsAt, timezone, deadline, priceCents, minimumPeople, capacity, status); Commitment(id, eventId, name, normalizedEmail, createdAt); Activity(id, eventId, type, createdAt). Emails are private and never exposed on public event reads.

1. Validate name, email, integer price, participant count and sensible dates. Deadline precedes event start.
2. Enforce uniqueness on `(eventId, normalizedEmail)`. This is demo deduplication, not verified identity.
3. In one server transaction, check event is collecting, deadline has not passed, capacity remains, insert commitment, count participants, and set confirmed if the minimum is reached. Make retries idempotent.
4. Reject joins after expiry or confirmation for this three-seat prototype. Show helpful duplicate/full/expired messages rather than a success animation.
5. Derive remaining time and totals from stored data. Do not hardcode the screenshot's countdown. A demo reset can set a fresh deadline 45 minutes ahead and restore the two sample participants.
6. When opening an expired collecting event, reconcile it to expired on the server. Confirmation remains confirmed even after the commitment deadline.
7. Every monetary figure is labeled as a demo commitment. Do not label it revenue, paid, captured, refunded, or authorized unless connected to actual Stripe test-state evidence.
8. Keep reset/force-preview controls in an isolated demo dataset and label them. An animation preview must not add a real commitment.
9. Calendar export uses the stored timezone/start time. CSV export includes only the organizer's demo participants; neutralize spreadsheet formula prefixes in user-entered cells.
10. Do not expose actual organizer records publicly. In a one-hour demo, use only fictional data in the organizer view; real multi-user access requires authentication and server authorization.

## Responsive behavior

At narrow widths, show the headline, event summary, progress and join action before the full decorative scene. Stack the booking panel naturally; no horizontal overflow. Collapse desktop navigation into a small accessible menu. Hide decorative leader labels before shrinking important text.

## One-hour order

0–10 minutes: brand shell and event detail page. 10–30: shared event and join transaction. 30–40: create form, explore and organizer pages from reusable components. 40–50: confirmation and core animation. 50–60: mobile pass and complete cross-device demo.

Prioritize one successful end-to-end path over ornate secondary features. Verify third-person confirmation, duplicate joins, expiry, persistence after refresh, and updated state across two browser sessions. Finish with run instructions and an honest list of implemented versus simulated features.
