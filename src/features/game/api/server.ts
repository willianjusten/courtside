import "server-only";
import { loadGameSummary } from "@/lib/server/loaders";
import { gameSummaryQueryOptions } from "./game-summary";

export const gameSummaryServerQuery = (gameId: string) => ({
  ...gameSummaryQueryOptions(gameId),
  queryFn: () => loadGameSummary(gameId),
});
