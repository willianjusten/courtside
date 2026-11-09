import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Game, Scoreboard } from "@/lib/domain/game";
import { scoreboardDateOf } from "@/features/teams/team-view";
import { useIsClient } from "@/lib/use-is-client";
import { currentNbaDate } from "@/lib/time/nba-date";
import {
  livePollingOptions,
  usePollingWindowRecheck,
} from "@/lib/live-polling/live-polling";
import { scoreboardQueryOptions } from "@/features/scoreboard/queries/scoreboard";

function teamGamesOf(scoreboard: Scoreboard | undefined, teamId: string) {
  return (scoreboard?.games ?? []).filter(
    ({ home, away }) => home.team.id === teamId || away.team.id === teamId,
  );
}

// Reads the scoreboard of the team's game day, polling only around the team's own game; null without a game that day.
export function useTeamScoreboard(
  teamId: string,
  games: Game[] | null,
): Game[] | null {
  const isClient = useIsClient();
  const nbaDate = isClient ? scoreboardDateOf(games, new Date()) : null;
  const selectTeamGames = useCallback(
    (scoreboard: Scoreboard) => teamGamesOf(scoreboard, teamId),
    [teamId],
  );
  const { data: teamGames } = useQuery({
    // Without a game day the query stays disabled, so today's date only fills in the key.
    ...scoreboardQueryOptions(nbaDate ?? currentNbaDate()),
    ...livePollingOptions(
      (scoreboard: Scoreboard | undefined) => teamGamesOf(scoreboard, teamId),
      "games-list",
    ),
    select: selectTeamGames,
    enabled: nbaDate !== null,
  });

  usePollingWindowRecheck(teamGames);

  // A disabled query still returns what the shared cache holds, such as the navigation's prefetched scoreboard.
  return nbaDate && teamGames ? teamGames : null;
}
