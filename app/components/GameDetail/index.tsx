"use client";

import { useGameSummary } from "@/app/lib/queries/use-game-summary";
import {
  buildGameView,
  type GameSummaryQueryState,
} from "@/app/lib/game/game-view";
import { useBrowserTimeZone } from "@/app/lib/time/use-browser-time-zone";
import { GameHeader, LineScore } from "./header";
import { BoxScore, GameLeaders, PlayByPlay, WinProbability } from "./sections";
import {
  GameDetailError,
  GameDetailLoading,
  GameNote,
  StaleGameNotice,
} from "./states";

export default function GameDetail({ gameId }: { gameId: string }) {
  const {
    data: summary,
    error,
    isFetching,
    isRefetchError,
    refetch,
  } = useGameSummary(gameId);
  const timeZone = useBrowserTimeZone();

  // Data is checked before the error: a failed refetch keeps the last valid summary instead of hiding it.
  const query: GameSummaryQueryState = summary
    ? isRefetchError
      ? { status: "stale", summary }
      : { status: "success", summary }
    : error
      ? { status: "error" }
      : { status: "loading" };
  const { screen, staleNotice } = buildGameView({ query, timeZone });

  switch (screen.kind) {
    case "loading":
      return <GameDetailLoading />;
    case "error":
      return (
        <GameDetailError onRetry={() => refetch()} isRetrying={isFetching} />
      );
    case "pre-game":
    case "postponed":
      return (
        <div className="flex flex-col gap-6">
          {staleNotice && <StaleGameNotice message={staleNotice} />}
          <GameHeader header={screen.header} />
          <GameNote note={screen.note} />
        </div>
      );
    case "live":
    case "final":
      return (
        <div className="flex flex-col gap-8">
          {staleNotice && <StaleGameNotice message={staleNotice} />}
          <GameHeader header={screen.header}>
            <LineScore
              lineScore={screen.lineScore}
              isLive={screen.kind === "live"}
            />
          </GameHeader>
          {/* Provisional sections, read from the summary until the game view covers them. */}
          {summary && (
            <>
              <GameLeaders game={summary.game} leaders={summary.leaders} />
              <WinProbability
                game={summary.game}
                points={summary.winProbability}
              />
              <BoxScore
                team={summary.game.away.team}
                boxScore={summary.boxScore.away}
              />
              <BoxScore
                team={summary.game.home.team}
                boxScore={summary.boxScore.home}
              />
              <PlayByPlay game={summary.game} plays={summary.plays} />
            </>
          )}
        </div>
      );
  }
}
