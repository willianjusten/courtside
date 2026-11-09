import {
  GAME_LEADER_STATS,
  type GameLeaderStat,
  type Leader,
  type LeaderCategory,
  type LeaderStat,
  type TeamLeaderCategory,
} from "@/lib/domain/leaders";
import type { ConferenceStandings } from "@/lib/domain/standings";
import { defaultConferenceOf } from "@/features/standings/favorite-conference";
import { streakKindOf, type StreakKind } from "@/features/standings/streak";

const TOP_TEAMS_COUNT = 5;
const RUNNERS_UP_COUNT = 2;
const TEAMS_PATH_PREFIX = "/teams/";
// The leader holds rank 1.
const FIRST_RUNNER_UP_RANK = 2;

export type SidebarStandingsRow = {
  teamId: string;
  seed: number;
  name: string;
  logoUrl: string | null;
  href: string;
  // Win-loss, e.g. "4-0".
  record: string;
  streak: string | null;
  streakKind: StreakKind | null;
  isFavorite: boolean;
};

export type SidebarStandings = {
  conferenceAbbreviation: string;
  rows: SidebarStandingsRow[];
};

export type SidebarRunnerUp = {
  rank: number;
  shortName: string;
  displayValue: string;
};

export type SidebarLeaderCategory =
  | {
      status: "ready";
      stat: GameLeaderStat;
      leader: Leader;
      runnersUp: SidebarRunnerUp[];
    }
  | { status: "empty" | "error"; stat: GameLeaderStat };

export function buildSidebarStandings(
  conferences: ConferenceStandings[],
  favoriteTeamIds: string[],
): SidebarStandings | null {
  const conference = defaultConferenceOf(conferences, favoriteTeamIds);
  if (!conference) return null;

  return {
    conferenceAbbreviation: conference.abbreviation,
    rows: conference.rows.slice(0, TOP_TEAMS_COUNT).map((row) => ({
      teamId: row.team.id,
      seed: row.seed,
      name: row.team.name,
      logoUrl: row.team.logoUrl,
      href: `${TEAMS_PATH_PREFIX}${row.team.slug}`,
      record: `${row.wins}-${row.losses}`,
      streak: row.streak,
      streakKind: streakKindOf(row.streak),
      isFavorite: favoriteTeamIds.includes(row.team.id),
    })),
  };
}

function isSidebarStat(stat: LeaderStat): stat is GameLeaderStat {
  return (GAME_LEADER_STATS as LeaderStat[]).includes(stat);
}

// Also builds the team page leaders, whose categories hold the team's own players.
export function buildSidebarLeaders(
  categories: (LeaderCategory | TeamLeaderCategory)[],
): SidebarLeaderCategory[] {
  return categories.flatMap(({ stat, leaders }): SidebarLeaderCategory | [] => {
    if (!isSidebarStat(stat)) return [];
    if (leaders === null) return { status: "error", stat };
    const [leader, ...rest] = leaders;
    if (!leader) return { status: "empty", stat };

    return {
      status: "ready",
      stat,
      leader,
      runnersUp: rest
        .slice(0, RUNNERS_UP_COUNT)
        .map(({ athlete, displayValue }, index) => ({
          rank: FIRST_RUNNER_UP_RANK + index,
          shortName: athlete.shortName,
          displayValue,
        })),
    };
  });
}
