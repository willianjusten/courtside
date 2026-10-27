import type { Game, GameCompetitor } from "@/app/lib/domain/game";
import type { GameSummary } from "@/app/lib/domain/game-summary";
import { finalLabel, isInProgress, leadingSideOf } from "@/app/lib/game/status";
import { readableTeamColors, type TeamSide } from "@/app/lib/home/team-colors";
import { strings } from "@/app/lib/strings";
import { formatLongNbaDate } from "@/app/lib/time/nba-date";

const SEPARATOR = strings.share.separator;

// One year, the longest max-age caches honor.
export const INDEFINITE_CACHE_SECONDS = 31_536_000;
// Three hours, about a game's length, so a preview catches up with the game's status.
export const SHORT_CACHE_SECONDS = 3 * 60 * 60;

export type ShareTeam = {
  abbreviation: string;
  displayName: string;
  // Null when ESPN has no logo; the image shows the abbreviation on the team color instead.
  logoUrl: string | null;
  color: string;
};

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

// The app's default image and metadata, for a game not covered yet or one that could not be loaded.
export type FallbackShareView = {
  variant: "fallback";
  cacheSeconds: number;
};

// A preview drawn for the game itself, as opposed to the app's default.
export type MatchupShareView =
  | ScheduledShareView
  | InProgressShareView
  | FinalShareView;

// What a shared game link previews: the Open Graph image and the page title and description.
export type ShareView = MatchupShareView | FallbackShareView;

const FALLBACK_SHARE_VIEW: FallbackShareView = {
  variant: "fallback",
  cacheSeconds: SHORT_CACHE_SECONDS,
};

function shareTeamOf({ team }: GameCompetitor, color: string): ShareTeam {
  return {
    abbreviation: team.abbreviation,
    displayName: team.displayName,
    logoUrl: team.logoUrl,
    color,
  };
}

function matchupTeamsOf({ home, away }: Game): Record<TeamSide, ShareTeam> {
  const colors = readableTeamColors(home.team, away.team);
  return {
    away: shareTeamOf(away, colors.away),
    home: shareTeamOf(home, colors.home),
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
    default:
      return FALLBACK_SHARE_VIEW;
  }
}

// A degraded image, such as one whose logo failed to load, is usually a passing hiccup, so it is never cached longer than briefly.
export function degradedImageCacheSeconds(shareView: ShareView): number {
  return Math.min(shareView.cacheSeconds, SHORT_CACHE_SECONDS);
}
