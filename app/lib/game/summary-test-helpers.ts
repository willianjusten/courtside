import type { Game } from "@/app/lib/domain/game";
import type { GameSummary } from "@/app/lib/domain/game-summary";
import { mapGameSummary } from "@/app/lib/espn/mappers";
import type { RawSummary } from "@/app/lib/espn/raw-types";

// Shared by the view tests that read ESPN summary fixtures.
export const summaryOf = (fixture: unknown) =>
  mapGameSummary(fixture as RawSummary);

export function withGame(
  summary: GameSummary,
  game: Partial<Game>,
): GameSummary {
  return { ...summary, game: { ...summary.game, ...game } };
}
