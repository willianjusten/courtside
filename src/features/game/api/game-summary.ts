import { queryOptions } from "@tanstack/react-query";
import { fetchGameSummary } from "@/lib/espn/game-summary";

export function gameSummaryQueryOptions(gameId: string) {
  return queryOptions({
    queryKey: ["game-summary", gameId],
    queryFn: () => fetchGameSummary(gameId),
  });
}
