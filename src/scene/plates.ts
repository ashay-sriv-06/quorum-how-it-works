import type { SceneKey } from "../../shared/types";
import traces from "./traces.json";

export interface Plate {
  src: string;
  width: number;
  height: number;
  /** transparent cobalt chair contour + its vector trace paths */
  seat?: { src: string; paths: string[]; box: [number, number, number, number] };
  /** where the empty chair's marker node sits, plate px */
  seatNode?: [number, number];
  /** plate px anchor points on people / seats, for annotations */
  anchors?: Record<string, [number, number]>;
}

const withSeat = (key: "seat" | "seat-close" | "table") => {
  const t = traces[key];
  return {
    src: `/scenes/${key}-seat.webp`,
    paths: t.paths,
    box: t.box as [number, number, number, number],
  };
};

export const PLATES: Record<SceneKey, Plate> = {
  seat: {
    src: "/scenes/seat.webp",
    width: 1950,
    height: 1270,
    seat: withSeat("seat"),
    seatNode: [1640, 718],
    anchors: { maya: [905, 470], jordan: [1368, 440], seatFront: [1350, 928] },
  },
  "seat-close": {
    src: "/scenes/seat-close.webp",
    width: 1108,
    height: 793,
    seat: withSeat("seat-close"),
    seatNode: [930, 512],
  },
  table: {
    src: "/scenes/table.webp",
    width: 1165,
    height: 815,
    seat: withSeat("table"),
    seatNode: [1022, 548],
    anchors: { one: [138, 552], two: [600, 350] },
  },
  circle: { src: "/scenes/circle.webp", width: 1760, height: 440 },
  "circle-wide": {
    src: "/scenes/circle-wide.webp",
    width: 1520,
    height: 660,
    anchors: { a: [420, 215], b: [790, 190], c: [1140, 215] },
  },
  walk: { src: "/scenes/walk.webp", width: 748, height: 318 },
  brew: { src: "/scenes/brew.webp", width: 748, height: 290 },
};
