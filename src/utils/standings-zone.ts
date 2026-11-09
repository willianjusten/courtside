import type { StandingsZone } from "@/types/standings";

// Seeds 1-6 go straight to the playoffs and seeds 7-10 to the play-in tournament.
const LAST_PLAYOFF_SEED = 6;
const LAST_PLAY_IN_SEED = 10;

export function zoneOf(seed: number): StandingsZone {
  if (seed <= LAST_PLAYOFF_SEED) return "playoff";
  if (seed <= LAST_PLAY_IN_SEED) return "play-in";
  return "none";
}
