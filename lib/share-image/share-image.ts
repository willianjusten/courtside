import type { Team } from "@/lib/domain/game";

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

export function shareTeamOf(team: Team, color: string): ShareTeam {
  return {
    abbreviation: team.abbreviation,
    displayName: team.displayName,
    logoUrl: team.logoUrl,
    color,
  };
}

// A degraded image, such as one whose logo failed to load, is usually a passing hiccup, so it is never cached longer than briefly.
export function degradedImageCacheSeconds({
  cacheSeconds,
}: {
  cacheSeconds: number;
}): number {
  return Math.min(cacheSeconds, SHORT_CACHE_SECONDS);
}
