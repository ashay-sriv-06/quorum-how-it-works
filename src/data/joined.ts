/** This browser's memory of the seats it took (demo identity, not auth). */
export interface JoinedSeat {
  name: string;
  commitmentId: string;
}

const key = (slug: string) => `quorum:joined:${slug}`;

export function readJoined(slug: string): JoinedSeat | null {
  try {
    const raw = localStorage.getItem(key(slug));
    return raw ? (JSON.parse(raw) as JoinedSeat) : null;
  } catch {
    return null;
  }
}

export function writeJoined(slug: string, seat: JoinedSeat) {
  try {
    localStorage.setItem(key(slug), JSON.stringify(seat));
  } catch {
    /* storage unavailable: the server still holds the commitment */
  }
}

export function forgetJoined(slug: string) {
  try {
    localStorage.removeItem(key(slug));
  } catch {
    /* ignore */
  }
}
