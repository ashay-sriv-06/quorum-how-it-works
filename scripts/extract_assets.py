"""Cut clean photographic plates out of the Quorum reference PNGs.

Each plate is split into:
  * <name>.webp        grayscale photograph, baked-in UI text inpainted away
  * <name>-seat.webp   transparent cobalt layer holding only the chair contour
                       (so the app can trace it with an SVG mask)

Run: python3 scripts/extract_assets.py
"""
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "scenes"
OUT.mkdir(parents=True, exist_ok=True)


def load(name):
    return cv2.imread(str(ROOT / name), cv2.IMREAD_COLOR)


def text_mask(img, boxes, thresh=95, grow=17):
    """Bright pixels inside the given boxes (UI text, labels), grown to swallow the
    dark halo the renderer painted behind each glyph."""
    gray = img.max(axis=2)
    mask = np.zeros(gray.shape, np.uint8)
    for x0, y0, x1, y1 in boxes:
        region = gray[y0:y1, x0:x1]
        mask[y0:y1, x0:x1] = (region > thresh).astype(np.uint8) * 255
    return cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow, grow)))


def blue_excess(img):
    b, g, r = [c.astype(np.int16) for c in cv2.split(img)]
    return np.clip(b - np.maximum(r, g), 0, 255).astype(np.uint8)


def split_plate(img, text_boxes=(), erase_blue=(), keep_blue=True, box_fill=(), erase_lines=()):
    """Return (grayscale base, RGBA seat layer or None)."""
    excess = blue_excess(img)
    for x0, y0, x1, y1 in erase_blue:
        excess[y0:y1, x0:x1] = 0
    for (ax, ay), (bx, by), width in erase_lines:
        cv2.line(excess, (ax, ay), (bx, by), 0, width)
        cv2.circle(excess, (ax, ay), width, 0, -1)

    line_mask = (excess > 26).astype(np.uint8) * 255
    line_mask = cv2.dilate(line_mask, np.ones((5, 5), np.uint8))

    # Anything blue that we erased (markers, leader lines) must also leave the base.
    raw_blue = (blue_excess(img) > 26).astype(np.uint8) * 255
    raw_blue = cv2.dilate(raw_blue, np.ones((5, 5), np.uint8))

    mask = cv2.bitwise_or(raw_blue, text_mask(img, text_boxes))
    for x0, y0, x1, y1 in box_fill:
        mask[y0:y1, x0:x1] = 255

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    base = cv2.inpaint(gray, mask, 9, cv2.INPAINT_TELEA)

    # Re-seed halftone grain over repaired areas so they don't read as smudges.
    rng = np.random.default_rng(7)
    grain = rng.normal(0, 7, base.shape).astype(np.int16)
    soft = cv2.GaussianBlur(mask, (0, 0), 3).astype(np.float32) / 255
    base = np.clip(base.astype(np.int16) + (grain * soft).astype(np.int16), 0, 255).astype(np.uint8)

    seat = None
    if keep_blue:
        # the page background itself is faintly blue; ignore that floor
        alpha = np.clip((excess.astype(np.float32) - 14) * 3.2, 0, 255)
        alpha = cv2.GaussianBlur(alpha, (0, 0), 0.6).astype(np.uint8)
        h, w = alpha.shape
        seat = np.zeros((h, w, 4), np.uint8)
        # cobalt #315BFF, brighter core where the line is strongest
        core = (alpha.astype(np.float32) / 255) ** 1.5
        seat[..., 0] = 255
        seat[..., 1] = (0x5B + core * 60).astype(np.uint8)
        seat[..., 2] = (0x31 + core * 50).astype(np.uint8)
        seat[..., 3] = alpha
    return base, seat


def save(name, base, seat=None, quality=84):
    cv2.imwrite(str(OUT / f"{name}.webp"), base, [cv2.IMWRITE_WEBP_QUALITY, quality])
    if seat is not None:
        cv2.imwrite(str(OUT / f"{name}-seat.webp"), seat, [cv2.IMWRITE_WEBP_QUALITY, 100])
    print(name, base.shape[1], "x", base.shape[0])


# 1. The hero plate: two people, one empty chair (from the event page).
join = load("Quorum_04_Event_Join.png")[90:1360, 0:1950].copy()
base, seat = split_plate(
    join,
    text_boxes=[
        (500, 310, 1000, 445),   # "portfolio." over the plant
        (1640, 605, 1870, 672),  # "THE LAST SEAT" label
    ],
    # empty dark room on the left: repaint wholesale (text, halos, avatar disc)
    box_fill=[(70, 95, 420, 165), (80, 185, 610, 312), (80, 312, 545, 450),
              (80, 450, 505, 535), (80, 530, 400, 625)],
    erase_lines=[((1543, 768), (1634, 620), 13)],  # leader line + node dot
    erase_blue=[(0, 0, 700, 1270)],  # bluish-grey UI text on the left
)
save("seat", base, seat)

# 2. Three people, no annotations (organizer page) -> circle / confirmed plate.
org = load("Quorum_06_Organizer.png")[300:740, 86:1846].copy()
base, _ = split_plate(org, keep_blue=False)
save("circle", base)

# 3. Explore feature card: same room, closer framing.
exp = load("Quorum_02_Explore.png")
card = exp[182:975, 720:1828].copy()
base, seat = split_plate(
    card,
    text_boxes=[(20, 25, 265, 90)],  # "ONE SEAT AWAY" badge
    box_fill=[(28, 32, 258, 84)],
    erase_blue=[(0, 0, 300, 120)],
)
save("seat-close", base, seat)

# 4. Photo walk + build & brew thumbnails.
walk = exp[182:500, 1862:2610].copy()
save("walk", split_plate(walk, keep_blue=False)[0])
brew = exp[775:1065, 1862:2610].copy()
save("brew", split_plate(brew, keep_blue=False)[0])

# 5. Top-down table (create page preview). Markers 01/02/03 are rebuilt in HTML.
create = load("Quorum_03_Create_Launch.png")[175:990, 1433:2598].copy()
base, seat = split_plate(
    create,
    text_boxes=[(30, 20, 300, 80)],  # "LIVE PREVIEW"
    erase_blue=[(0, 0, 130, 100), (70, 430, 250, 590), (540, 270, 690, 390), (1000, 440, 1130, 528)],
    erase_lines=[((1013, 545), (1040, 520), 9)],
)
save("table", base, seat)

# 6. Three people with room to breathe (confirmation page). Labels rebuilt in HTML.
conf = load("Quorum_05_Confirmed.png")[450:1110, 520:2040].copy()
base, _ = split_plate(
    conf,
    keep_blue=False,
    text_boxes=[(430, 120, 555, 190), (915, 120, 1065, 190), (1265, 120, 1390, 190)],
    box_fill=[(440, 130, 545, 178), (925, 130, 1055, 178), (1272, 130, 1380, 178)],
)
save("circle-wide", base)

# 7. Avatars from the organizer table (Maya, Jordan, Alex).
org_full = load("Quorum_06_Organizer.png")
for name, cy in (("maya", 1075), ("jordan", 1146), ("alex", 1215)):
    face = org_full[cy - 32 : cy + 32, 145 - 32 : 145 + 32]
    face = cv2.resize(cv2.cvtColor(face, cv2.COLOR_BGR2GRAY), (128, 128), interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(str(OUT / f"avatar-{name}.webp"), face, [cv2.IMWRITE_WEBP_QUALITY, 90])
print("avatars ok")
