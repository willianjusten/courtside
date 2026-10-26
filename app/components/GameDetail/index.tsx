"use client";

import { useSearchParams } from "next/navigation";
import { useGameSummary } from "@/app/lib/queries/use-game-summary";
import {
  buildGameView,
  type GameSummaryQueryState,
} from "@/app/lib/game/game-view";
import { useBrowserTimeZone } from "@/app/lib/time/use-browser-time-zone";
import { GameHeader, LineScore } from "./header";
import { GameSections } from "./game-sections";
import { BoxScore } from "./box-score";
import { GameFlow } from "./game-flow";
import { GameLeaders } from "./game-leaders";
import { Highlights } from "./highlights";
import { PlayByPlay } from "./play-by-play";
import { TeamStats } from "./team-stats";
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
  const tabParam = useSearchParams()?.get("tab") ?? null;

  // Data is checked before the error: a failed refetch keeps the last valid summary instead of hiding it.
  const query: GameSummaryQueryState = summary
    ? isRefetchError
      ? { status: "stale", summary }
      : { status: "success", summary }
    : error
      ? { status: "error" }
      : { status: "loading" };
  const { screen, staleNotice } = buildGameView({
    query,
    timeZone,
    tabParam,
  });

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
        <div className="flex flex-col gap-4 md:gap-6">
          {staleNotice && <StaleGameNotice message={staleNotice} />}
          <GameHeader header={screen.header}>
            <LineScore
              lineScore={screen.lineScore}
              isLive={screen.kind === "live"}
            />
          </GameHeader>
          <GameSections
            tabs={screen.tabs}
            // Replacing the entry keeps the tab in the URL without adding a history step per tab.
            onSelectTab={({ href }) =>
              window.history.replaceState(null, "", href)
            }
            highlights={
              screen.highlights && <Highlights highlights={screen.highlights} />
            }
            leaders={<GameLeaders leaders={screen.leaders} />}
            gameFlow={<GameFlow gameFlow={screen.gameFlow} />}
            boxScore={<BoxScore boxScore={screen.boxScore} />}
            teamStats={<TeamStats teamStats={screen.teamStats} />}
            plays={<PlayByPlay playByPlay={screen.playByPlay} />}
          />
        </div>
      );
  }
}
