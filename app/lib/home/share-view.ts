import type { Game, Scoreboard } from "@/app/lib/domain/game";
import {
  SHORT_CACHE_SECONDS,
  shareTeamOf,
  type ShareTeam,
} from "@/app/lib/share-image/share-image";
import { strings } from "@/app/lib/strings";
import { formatLongNbaDate } from "@/app/lib/time/nba-date";
import { readableTeamColors, type TeamSide } from "./team-colors";

// Two columns of three tiles, the most that stay readable at thumbnail size.
export const SLATE_MATCHUPS_SHOWN = 6;

export type SlateMatchup = Record<TeamSide, ShareTeam>;

// Today's games as matchups only. Never carries scores, clocks or statuses, which a cached preview would show long after they changed.
export type SlateShareView = {
  variant: "slate";
  dateLabel: string;
  // e.g. "11 games".
  gamesLabel: string;
  matchups: SlateMatchup[];
  // e.g. "+5 more"; null when every game is shown.
  moreLabel: string | null;
  alt: string;
  cacheSeconds: number;
};

// The app's default image, for a day without games or a scoreboard that could not be loaded.
export type HomeFallbackShareView = {
  variant: "fallback";
  cacheSeconds: number;
};

// What a shared home page link previews.
export type HomeShareView = SlateShareView | HomeFallbackShareView;

const HOME_FALLBACK_SHARE_VIEW: HomeFallbackShareView = {
  variant: "fallback",
  // Cached briefly, so the preview catches up with the next day or a recovered ESPN.
  cacheSeconds: SHORT_CACHE_SECONDS,
};

function slateMatchupOf({ home, away }: Game): SlateMatchup {
  const colors = readableTeamColors(home.team, away.team);
  return {
    away: shareTeamOf(away.team, colors.away),
    home: shareTeamOf(home.team, colors.home),
  };
}

// A null scoreboard stands for one that could not be loaded.
export function homeShareViewOf(scoreboard: Scoreboard | null): HomeShareView {
  if (!scoreboard || scoreboard.games.length === 0) {
    return HOME_FALLBACK_SHARE_VIEW;
  }

  const { games, nbaDate } = scoreboard;
  const dateLabel = formatLongNbaDate(nbaDate);
  const gamesLabel = strings.share.gamesCount(games.length);
  const hiddenGames = games.length - SLATE_MATCHUPS_SHOWN;

  return {
    variant: "slate",
    dateLabel,
    gamesLabel,
    matchups: games.slice(0, SLATE_MATCHUPS_SHOWN).map(slateMatchupOf),
    moreLabel: hiddenGames > 0 ? strings.share.moreGames(hiddenGames) : null,
    alt: [gamesLabel, dateLabel].join(strings.share.separator),
    // Three hours, so the preview catches up with the new day.
    cacheSeconds: SHORT_CACHE_SECONDS,
  };
}
