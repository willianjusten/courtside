import { useCallback, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Game, Scoreboard } from "@/app/lib/domain/game";
import { scoreboardDateOf } from "@/app/lib/team/team-view";
import { currentNbaDate } from "@/app/lib/time/nba-date";
import { livePollingOptions, usePollingWindowRecheck } from "./live-polling";
import { scoreboardQueryOptions } from "./scoreboard";

const subscribeToNothing = () => () => {};
// The prerendered page, and the first client render that hydrates it, don't know the viewer's current date.
const isClientRender = () => true;
const isServerRender = () => false;

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
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    isClientRender,
    isServerRender,
  );
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
