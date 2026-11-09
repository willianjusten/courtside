import type { Game } from "@/lib/domain/game";
import type { GameSummary } from "@/lib/domain/game-summary";
import { mapGameSummary } from "@/lib/espn/mappers";
import type { RawSummary } from "@/lib/espn/raw-types";

// Shared by the view tests that read ESPN summary fixtures.
export const summaryOf = (fixture: unknown) =>
  mapGameSummary(fixture as RawSummary);

export function withGame(
  summary: GameSummary,
  game: Partial<Game>,
): GameSummary {
  return { ...summary, game: { ...summary.game, ...game } };
}
