import { useQuery } from "@tanstack/react-query";
import type { Scoreboard } from "@/lib/domain/game";
import type { NbaDate } from "@/lib/domain/nba-date";
import {
  livePollingOptions,
  usePollingWindowRecheck,
} from "@/lib/live-polling/live-polling";
import { scoreboardQueryOptions } from "./scoreboard";

const gamesOfScoreboard = (scoreboard: Scoreboard | undefined) =>
  scoreboard?.games ?? [];

export function useScoreboard(nbaDate: NbaDate) {
  const scoreboardQuery = useQuery({
    ...scoreboardQueryOptions(nbaDate),
    ...livePollingOptions(gamesOfScoreboard, "games-list"),
  });

  usePollingWindowRecheck(scoreboardQuery.data?.games);

  return scoreboardQuery;
}
