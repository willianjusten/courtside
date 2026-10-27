import type { GameCompetitor } from "@/app/lib/domain/game";
import type { GameSummary } from "@/app/lib/domain/game-summary";
import { finalLabel, leadingSideOf } from "@/app/lib/game/status";
import { readableTeamColors, type TeamSide } from "@/app/lib/home/team-colors";
import { strings } from "@/app/lib/strings";

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

// What a shared game link previews: the Open Graph image and the page title and description.
export type FinalShareView = {
  variant: "final";
  away: ShareTeam;
  home: ShareTeam;
  score: Record<TeamSide, number>;
  // Null on a tie, which a final game never has but the score cannot rule out.
  winningSide: TeamSide | null;
  statusLabel: string;
  title: string;
  description: string;
  cacheSeconds: number;
};

// The app's default image and metadata, for a game not covered yet or one that could not be loaded.
export type FallbackShareView = {
  variant: "fallback";
  cacheSeconds: number;
};

export type ShareView = FinalShareView | FallbackShareView;

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

// A null summary stands for a game that could not be loaded.
export function shareViewOf(summary: GameSummary | null): ShareView {
  if (!summary || summary.game.status.kind !== "final") {
    return FALLBACK_SHARE_VIEW;
  }

  const { home, away, status } = summary.game;
  const colors = readableTeamColors(home.team, away.team);
  const statusLabel = finalLabel(status.period);

  return {
    variant: "final",
    away: shareTeamOf(away, colors.away),
    home: shareTeamOf(home, colors.home),
    score: { away: away.score, home: home.score },
    winningSide: leadingSideOf(summary.game),
    statusLabel,
    title: [
      strings.share.finalTitle(
        away.team.abbreviation,
        away.score,
        home.score,
        home.team.abbreviation,
      ),
      statusLabel,
    ].join(SEPARATOR),
    description: [
      strings.share.finalDescription(
        away.team.displayName,
        away.score,
        home.team.displayName,
        home.score,
      ),
      statusLabel,
    ].join(SEPARATOR),
    cacheSeconds: INDEFINITE_CACHE_SECONDS,
  };
}
