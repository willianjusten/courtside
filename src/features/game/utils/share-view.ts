import type { Game } from "@/types/game";
import type { GameSummary } from "@/types/game-summary";
import { finalLabel, isInProgress, leadingSideOf } from "@/utils/game-status";
import { readableTeamColors, type TeamSide } from "@/utils/team-colors";
import {
  INDEFINITE_CACHE_SECONDS,
  SHORT_CACHE_SECONDS,
  shareTeamOf,
  type ShareTeam,
} from "@/lib/share-image/share-image";
import { strings } from "@/config/strings";
import { formatLongNbaDate } from "@/utils/nba-date";

const SEPARATOR = strings.share.separator;

type MatchupFields = {
  away: ShareTeam;
  home: ShareTeam;
  statusLabel: string;
  title: string;
  description: string;
  cacheSeconds: number;
};

export type ScheduledShareView = MatchupFields & { variant: "scheduled" };

// Live or at halftime. Never carries the score or clock, which a cached preview would show long after they changed.
export type InProgressShareView = MatchupFields & { variant: "in-progress" };

export type FinalShareView = MatchupFields & {
  variant: "final";
  score: Record<TeamSide, number>;
  // Null on a tie, which a final game never has but the score cannot rule out.
  winningSide: TeamSide | null;
};

export type PostponedShareView = MatchupFields & { variant: "postponed" };

export type CanceledShareView = MatchupFields & { variant: "canceled" };

// The app's default image and metadata, for a game that could not be loaded.
export type FallbackShareView = {
  variant: "fallback";
  cacheSeconds: number;
};

// A preview drawn for the game itself, as opposed to the app's default.
export type MatchupShareView =
  | ScheduledShareView
  | InProgressShareView
  | FinalShareView
  | PostponedShareView
  | CanceledShareView;

// What a shared game link previews: the Open Graph image and the page title and description.
export type ShareView = MatchupShareView | FallbackShareView;

const FALLBACK_SHARE_VIEW: FallbackShareView = {
  variant: "fallback",
  cacheSeconds: SHORT_CACHE_SECONDS,
};

function matchupTeamsOf({ home, away }: Game): Record<TeamSide, ShareTeam> {
  const colors = readableTeamColors(home.team, away.team);
  return {
    away: shareTeamOf(away.team, colors.away),
    home: shareTeamOf(home.team, colors.home),
  };
}

const withStatus = (text: string, statusLabel: string) =>
  [text, statusLabel].join(SEPARATOR);

// "AWAY vs HOME · status", for a game without a score to show.
function unscoredLabelsOf({ home, away }: Game, statusLabel: string) {
  return {
    statusLabel,
    title: withStatus(
      strings.share.matchup(away.team.abbreviation, home.team.abbreviation),
      statusLabel,
    ),
    description: withStatus(
      strings.share.matchup(away.team.displayName, home.team.displayName),
      statusLabel,
    ),
  };
}

function scheduledShareViewOf(game: Game): ScheduledShareView {
  return {
    variant: "scheduled",
    ...matchupTeamsOf(game),
    ...unscoredLabelsOf(game, formatLongNbaDate(game.nbaDate)),
    cacheSeconds: SHORT_CACHE_SECONDS,
  };
}

function inProgressShareViewOf(game: Game): InProgressShareView {
  return {
    variant: "in-progress",
    ...matchupTeamsOf(game),
    ...unscoredLabelsOf(game, strings.gameStatus.live),
    cacheSeconds: SHORT_CACHE_SECONDS,
  };
}

function postponedShareViewOf(game: Game): PostponedShareView {
  return {
    variant: "postponed",
    ...matchupTeamsOf(game),
    ...unscoredLabelsOf(game, strings.gameStatus.postponed),
    // Cached briefly because ESPN can reschedule a postponed game under the same event id, with a new date.
    cacheSeconds: SHORT_CACHE_SECONDS,
  };
}

function canceledShareViewOf(game: Game): CanceledShareView {
  return {
    variant: "canceled",
    ...matchupTeamsOf(game),
    ...unscoredLabelsOf(game, strings.gameStatus.canceled),
    cacheSeconds: INDEFINITE_CACHE_SECONDS,
  };
}

function finalShareViewOf(game: Game, period: number): FinalShareView {
  const { home, away } = game;
  const statusLabel = finalLabel(period);

  return {
    variant: "final",
    ...matchupTeamsOf(game),
    score: { away: away.score, home: home.score },
    winningSide: leadingSideOf(game),
    statusLabel,
    title: withStatus(
      strings.share.finalTitle(
        away.team.abbreviation,
        away.score,
        home.score,
        home.team.abbreviation,
      ),
      statusLabel,
    ),
    description: withStatus(
      strings.share.finalDescription(
        away.team.displayName,
        away.score,
        home.team.displayName,
        home.score,
      ),
      statusLabel,
    ),
    cacheSeconds: INDEFINITE_CACHE_SECONDS,
  };
}

// A null summary stands for a game that could not be loaded.
export function shareViewOf(summary: GameSummary | null): ShareView {
  if (!summary) return FALLBACK_SHARE_VIEW;

  const { game } = summary;
  if (isInProgress(game.status)) return inProgressShareViewOf(game);
  switch (game.status.kind) {
    case "scheduled":
      return scheduledShareViewOf(game);
    case "final":
      return finalShareViewOf(game, game.status.period);
    case "postponed":
      return postponedShareViewOf(game);
    case "canceled":
      return canceledShareViewOf(game);
  }
}
