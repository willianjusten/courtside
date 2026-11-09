import type { ConferenceStandings } from "@/types/standings";
import { defaultConferenceOf } from "@/utils/favorite-conference";
import { streakKindOf, type StreakKind } from "@/utils/streak";

const TOP_TEAMS_COUNT = 5;
const TEAMS_PATH_PREFIX = "/teams/";

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
