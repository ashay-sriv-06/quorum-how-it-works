"""Vectorize each cobalt chair layer into SVG contour paths.

The paths are used as a stroked SVG mask: animating stroke-dashoffset reveals the
raster chair outline as if it were being drawn. Output: src/scene/traces.json
"""
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SCENES = ROOT / "public" / "scenes"
OUT = ROOT / "src" / "scene" / "traces.json"

traces = {}
for name in ("seat", "seat-close", "table"):
    layer = cv2.imread(str(SCENES / f"{name}-seat.webp"), cv2.IMREAD_UNCHANGED)
    alpha = layer[..., 3]
    mask = (alpha > 90).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    grown = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    contours, _ = cv2.findContours(grown, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)

    paths = []
    for c in sorted(contours, key=lambda c: -cv2.arcLength(c, True)):
        length = cv2.arcLength(c, True)
        if length < 120:
            continue
        pts = cv2.approxPolyDP(c, 1.6, True).reshape(-1, 2)
        # begin each contour at its top-most point so the draw reads top -> down
        start = int(np.argmin(pts[:, 1]))
        pts = np.roll(pts, -start, axis=0)
        d = "M" + " L".join(f"{x} {y}" for x, y in pts) + " Z"
        paths.append(d)

    ys, xs = np.nonzero(mask)
    h, w = alpha.shape
    traces[name] = {
        "width": int(w),
        "height": int(h),
        "paths": paths,
        # bounding box of the chair in plate pixels, used to place the seat node
        "box": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
    }
    print(name, len(paths), "paths", traces[name]["box"])

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(traces))
print("wrote", OUT.relative_to(ROOT), OUT.stat().st_size, "bytes")
