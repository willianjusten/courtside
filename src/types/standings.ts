import type { SeasonType } from "./game";
import type { ListedTeam } from "./team";

export type SeasonPhase = SeasonType | "offseason";

export type Season = {
  // ESPN names a season by the year it ends in, e.g. 2027 for 2026-27.
  year: number;
  displayName: string;
  currentPhase: SeasonPhase;
};

// The postseason spot a team has secured or lost.
export type Clincher = "playoffs" | "play-in" | "eliminated";

export type StandingsRow = {
  team: ListedTeam;
  seed: number;
  wins: number;
  losses: number;
  // Fraction between 0 and 1.
  winPercent: number;
  // 0 for the conference leader.
  gamesBehind: number;
  // Win-loss strings, e.g. "3-1".
  homeRecord: string;
  roadRecord: string;
  lastTenRecord: string;
  // e.g. "W3" or "L1"; null before the team has played.
  streak: string | null;
  // Average points scored minus allowed per game, e.g. 4.2.
  pointDifferential: number;
  // null while the spot is still open.
  clincher: Clincher | null;
};

export type ConferenceStandings = {
  id: string;
  name: string;
  abbreviation: string;
  // Ordered by playoff seed.
  rows: StandingsRow[];
};

export type Standings = {
  season: Season;
  conferences: ConferenceStandings[];
};

export type StandingsQueryState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; standings: Standings }
  // A refetch failed, so the last standings are kept.
  | { status: "stale"; standings: Standings };

export type StandingsZone = "playoff" | "play-in" | "none";
