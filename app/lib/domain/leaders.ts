import type { ListedTeam } from "./team";

// The stats a game's leaders are tracked in.
export type GameLeaderStat = "points" | "rebounds" | "assists";

export type LeaderStat =
  | GameLeaderStat
  | "steals"
  | "blocks"
  | "threesMade"
  | "fieldGoalPercentage"
  | "freeThrowPercentage";

export const GAME_LEADER_STATS: GameLeaderStat[] = [
  "points",
  "rebounds",
  "assists",
];

// In the order the league leaders are shown.
export const LEADER_STATS: LeaderStat[] = [
  ...GAME_LEADER_STATS,
  "steals",
  "blocks",
  "threesMade",
  "fieldGoalPercentage",
  "freeThrowPercentage",
];

export type LeaderAthlete = {
  id: string;
  displayName: string;
  // Initial and last name, e.g. "L. Dončić".
  shortName: string;
  headshotUrl: string | null;
};

export type Leader = {
  athlete: LeaderAthlete;
  // Per-game average, e.g. 31.4, or a percentage from 0 to 100, e.g. 52.3.
  value: number;
  displayValue: string;
};

export type LeagueLeader = Leader & {
  // null when the team ESPN names is not in the teams list.
  team: ListedTeam | null;
};

export type LeaderCategory = {
  stat: LeaderStat;
  // Best first. Empty before any regular season game has been played; null when the category's athletes could not be loaded.
  leaders: LeagueLeader[] | null;
};
