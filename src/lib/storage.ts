// LocalStorage persistence layer (offline-first).
import type { Match, SavedTeam } from "./types";

const K_TEAMS = "gcs:teams:v1";
const K_MATCHES = "gcs:matches:v1";
const K_ACTIVE = "gcs:activeMatchId:v1";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export const storage = {
  getTeams: () => read<SavedTeam[]>(K_TEAMS, []),
  setTeams: (t: SavedTeam[]) => write(K_TEAMS, t),
  getMatches: () => read<Match[]>(K_MATCHES, []),
  setMatches: (m: Match[]) => write(K_MATCHES, m),
  getActiveMatchId: () => read<string | null>(K_ACTIVE, null),
  setActiveMatchId: (id: string | null) => write(K_ACTIVE, id),
};
