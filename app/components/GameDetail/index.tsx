"use client";

import { useSearchParams } from "next/navigation";
import { useGameSummary } from "@/app/lib/queries/use-game-summary";
import {
  buildGameView,
  type GameSummaryQueryState,
} from "@/app/lib/game/game-view";
import { strings } from "@/app/lib/strings";
import { useBrowserTimeZone } from "@/app/lib/time/use-browser-time-zone";
import { GameHeader, LineScore } from "./header";
import { GameSections } from "./game-sections";
import { BoxScore } from "./box-score";
import {
  GameLeaders,
  PendingSection,
  PlayByPlay,
  WinProbability,
} from "./sections";
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
          {/* Provisional sections, read from the summary until the game view covers them. */}
          {summary && (
            <GameSections
              tabs={screen.tabs}
              // Replacing the entry keeps the tab in the URL without adding a history step per tab.
              onSelectTab={({ href }) =>
                window.history.replaceState(null, "", href)
              }
              highlights={
                <PendingSection
                  headingId="game-highlights"
                  title={strings.game.highlights.title}
                  note={strings.game.highlights.pending}
                />
              }
              leaders={
                <GameLeaders game={summary.game} leaders={summary.leaders} />
              }
              gameFlow={
                <WinProbability
                  game={summary.game}
                  points={summary.winProbability}
                />
              }
              boxScore={<BoxScore boxScore={screen.boxScore} />}
              teamStats={
                <PendingSection
                  headingId="game-team-stats"
                  title={strings.game.teamStats.title}
                  note={strings.game.teamStats.pending}
                />
              }
              plays={<PlayByPlay game={summary.game} plays={summary.plays} />}
            />
          )}
        </div>
      );
  }
}
