import type { Standings, StandingsRow } from "@/app/lib/domain/standings";
import { readableTeamColor } from "@/app/lib/home/team-colors";
import {
  SHORT_CACHE_SECONDS,
  shareTeamOf,
  type ShareTeam,
} from "@/app/lib/share-image/share-image";
import { strings } from "@/app/lib/strings";
import { isBeforeRegularSeason } from "./standings-view";

// The top five seeds per conference, the most that stay readable side by side at thumbnail size.
export const SEEDS_SHOWN = 5;

export type StandingsShareRow = {
  seed: number;
  team: ShareTeam;
  // Win-loss, e.g. "3-1".
  record: string;
};

export type StandingsShareConference = {
  // e.g. "East".
  label: string;
  rows: StandingsShareRow[];
};

export type ConferencesShareView = {
  variant: "conferences";
  // e.g. "SEASON 2026–27".
  seasonLabel: string;
  conferences: StandingsShareConference[];
  alt: string;
  cacheSeconds: number;
};

// The app's default image, before the regular season or for standings that could not be loaded.
export type StandingsFallbackShareView = {
  variant: "fallback";
  cacheSeconds: number;
};

// What a shared standings page link previews.
export type StandingsShareView =
  | ConferencesShareView
  | StandingsFallbackShareView;

const STANDINGS_FALLBACK_SHARE_VIEW: StandingsFallbackShareView = {
  variant: "fallback",
  // Cached briefly, so the preview catches up with the first games or a recovered ESPN.
  cacheSeconds: SHORT_CACHE_SECONDS,
};

function shareRowOf(row: StandingsRow): StandingsShareRow {
  return {
    seed: row.seed,
    team: shareTeamOf(row.team, readableTeamColor(row.team)),
    record: `${row.wins}-${row.losses}`,
  };
}

// A null standings stands for standings that could not be loaded.
export function standingsShareViewOf(
  standings: Standings | null,
): StandingsShareView {
  if (!standings || isBeforeRegularSeason(standings)) {
    return STANDINGS_FALLBACK_SHARE_VIEW;
  }

  const seasonLabel = strings.standings.season(standings.season.displayName);

  return {
    variant: "conferences",
    seasonLabel,
    conferences: standings.conferences.map((conference) => ({
      label: conference.abbreviation,
      rows: [...conference.rows]
        .sort((first, second) => first.seed - second.seed)
        .slice(0, SEEDS_SHOWN)
        .map(shareRowOf),
    })),
    alt: [strings.standings.title, seasonLabel].join(strings.share.separator),
    // Standings move after every game, so the preview catches up within about a game's length.
    cacheSeconds: SHORT_CACHE_SECONDS,
  };
}
