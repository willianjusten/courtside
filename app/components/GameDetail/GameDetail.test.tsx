import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import finalSummary from "@/app/lib/espn/__fixtures__/summary-final.json";
import liveSummary from "@/app/lib/espn/__fixtures__/summary-live.json";
import preGameSummary from "@/app/lib/espn/__fixtures__/summary-pre-game.json";
import { makeQueryClient } from "@/app/lib/query/make-query-client";
import { strings } from "@/app/lib/strings";
import GameDetail from ".";

const GAME_ID = "401909093";
const GAME_DETAIL_POLLING_MS = 8_000;
const DURING_LIVE_GAME = new Date("2026-10-22T23:45:00Z");
// Five minutes before the pre-game fixture's 01:30Z tip-off, inside the pre-game polling window.
const SHORTLY_BEFORE_TIP_OFF = new Date("2026-10-23T01:25:00Z");
const HOURS_BEFORE_TIP_OFF = new Date("2026-10-22T22:00:00Z");
const ONE_MINUTE_BEFORE_POLLING_WINDOW = new Date("2026-10-23T01:19:00Z");
const ONE_MINUTE_MS = 60_000;

// The same live game after the final buzzer, so the polled game does not change identity mid-test.
const liveGameEndedSummary = {
  ...liveSummary,
  header: {
    ...liveSummary.header,
    competitions: [
      {
        ...liveSummary.header.competitions[0],
        status: finalSummary.header.competitions[0].status,
      },
    ],
  },
};

const fetchMock = vi.fn();

// Next.js keeps useSearchParams in sync with native history calls; this stand-in does the same over happy-dom's history.
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const searchListeners = new Set<() => void>();
  const notifySearchListeners = () =>
    searchListeners.forEach((listener) => listener());

  for (const method of ["pushState", "replaceState"] as const) {
    const originalMethod = window.history[method].bind(window.history);
    window.history[method] = (...args) => {
      originalMethod(...args);
      notifySearchListeners();
    };
  }

  const subscribe = (listener: () => void) => {
    searchListeners.add(listener);
    return () => searchListeners.delete(listener);
  };
  return {
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(subscribe, () => window.location.search),
      ),
  };
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

function renderGameDetail() {
  const queryClient = makeQueryClient();
  // setDefaultOptions replaces the defaults, so the app's staleTime is kept to prove the focus refetch ignores it.
  const appDefaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...appDefaults,
    queries: { ...appDefaults.queries, retry: false },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <GameDetail gameId={GAME_ID} />
    </QueryClientProvider>,
  );
}

async function renderLoadedGameDetail(summary: unknown, now: Date) {
  vi.useFakeTimers({ now, shouldAdvanceTime: true });
  fetchMock.mockResolvedValueOnce(jsonResponse(summary));
  renderGameDetail();
  expect(await screen.findByRole("heading", { level: 1 })).toBeDefined();
  expect(fetchMock).toHaveBeenCalledTimes(1);
}

async function waitOnePollingInterval() {
  await act(() => vi.advanceTimersByTimeAsync(GAME_DETAIL_POLLING_MS));
}

function setTabVisibility(visibilityState: DocumentVisibilityState) {
  vi.spyOn(document, "visibilityState", "get").mockReturnValue(visibilityState);
  act(() => {
    window.dispatchEvent(new Event("visibilitychange"));
  });
}

beforeEach(() => {
  window.history.replaceState(null, "", `/game/${GAME_ID}`);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GameDetail live polling", () => {
  it("refetches the summary every 8 seconds while the game is live", async () => {
    await renderLoadedGameDetail(liveSummary, DURING_LIVE_GAME);

    fetchMock.mockResolvedValue(jsonResponse(liveSummary));
    await waitOnePollingInterval();
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await waitOnePollingInterval();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("polls a game that tips off within 10 minutes", async () => {
    await renderLoadedGameDetail(preGameSummary, SHORTLY_BEFORE_TIP_OFF);

    fetchMock.mockResolvedValue(jsonResponse(preGameSummary));
    await waitOnePollingInterval();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not poll a game that tips off hours from now", async () => {
    await renderLoadedGameDetail(preGameSummary, HOURS_BEFORE_TIP_OFF);

    await waitOnePollingInterval();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("starts polling when the game enters the 10-minute pre-game window", async () => {
    await renderLoadedGameDetail(
      preGameSummary,
      ONE_MINUTE_BEFORE_POLLING_WINDOW,
    );
    fetchMock.mockResolvedValue(jsonResponse(preGameSummary));

    await waitOnePollingInterval();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(ONE_MINUTE_MS));
    await waitOnePollingInterval();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops polling once the game is final", async () => {
    await renderLoadedGameDetail(liveSummary, DURING_LIVE_GAME);

    fetchMock.mockResolvedValue(jsonResponse(liveGameEndedSummary));
    await waitOnePollingInterval();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText(strings.gameStatus.final)).not.toHaveLength(0);

    await waitOnePollingInterval();
    await waitOnePollingInterval();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("pauses polling while the tab is hidden and refetches on return", async () => {
    await renderLoadedGameDetail(liveSummary, DURING_LIVE_GAME);

    fetchMock.mockResolvedValue(jsonResponse(liveSummary));
    setTabVisibility("hidden");
    await waitOnePollingInterval();
    await waitOnePollingInterval();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    setTabVisibility("visible");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("keeps the last data with a stale notice when a refetch fails, and clears it after recovery", async () => {
    await renderLoadedGameDetail(liveSummary, DURING_LIVE_GAME);

    fetchMock.mockResolvedValueOnce(new Response("", { status: 503 }));
    await waitOnePollingInterval();

    expect(await screen.findByText(strings.game.stale)).toBeDefined();
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();

    fetchMock.mockResolvedValueOnce(jsonResponse(liveSummary));
    await waitOnePollingInterval();

    await vi.waitFor(() =>
      expect(screen.queryByText(strings.game.stale)).toBeNull(),
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
  });
});

describe("GameDetail tabs", () => {
  it("opens on Summary when the URL has no tab", async () => {
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    expect(
      screen
        .getByRole("tab", { name: strings.game.tabs.summary })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("restores the tab kept in the URL", async () => {
    window.history.replaceState(null, "", `/game/${GAME_ID}?tab=plays`);
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    expect(
      screen
        .getByRole("tab", { name: strings.game.tabs.plays })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("keeps the selected tab in the URL without adding history entries", async () => {
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);
    const historyLength = window.history.length;

    fireEvent.mouseDown(
      screen.getByRole("tab", { name: strings.game.tabs.box }),
    );

    expect(window.location.search).toBe("?tab=box");
    expect(window.history.length).toBe(historyLength);
    expect(
      screen
        .getByRole("tab", { name: strings.game.tabs.box })
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("moves between tabs with the arrow keys", async () => {
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);
    const summaryTab = screen.getByRole("tab", {
      name: strings.game.tabs.summary,
    });

    act(() => summaryTab.focus());
    fireEvent.keyDown(summaryTab, { key: "ArrowRight" });

    // Radix moves the focus on the next tick.
    await vi.waitFor(() =>
      expect(document.activeElement?.textContent).toBe(strings.game.tabs.box),
    );
    expect(window.location.search).toBe("?tab=box");
  });
});

describe("GameDetail box score", () => {
  const teamButton = (name: string) => screen.getByRole("button", { name });
  const boxScoreTable = () =>
    within(
      screen.getByRole("region", { name: strings.game.boxScore.title }),
    ).getByRole("table");

  it("shows the away team first and switches teams with the toggle", async () => {
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    expect(teamButton("Warriors").getAttribute("aria-pressed")).toBe("true");
    expect(teamButton("Lakers").getAttribute("aria-pressed")).toBe("false");
    expect(
      within(boxScoreTable()).getByText(
        strings.game.boxScore.caption("Warriors"),
      ),
    ).toBeDefined();

    fireEvent.click(teamButton("Lakers"));

    expect(teamButton("Lakers").getAttribute("aria-pressed")).toBe("true");
    expect(
      within(boxScoreTable()).getByText(
        strings.game.boxScore.caption("Lakers"),
      ),
    ).toBeDefined();
  });

  it("groups the starters, the bench, and the players who did not play, then the totals", async () => {
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);
    fireEvent.click(teamButton("Lakers"));

    const rowTexts = within(boxScoreTable())
      .getAllByRole("row")
      .map((row) => row.textContent);
    const indexOfRow = (text: string) =>
      rowTexts.findIndex((name) => name?.includes(text));

    expect(indexOfRow(strings.game.boxScore.groups.starters)).toBeLessThan(
      indexOfRow("Doncic"),
    );
    expect(indexOfRow("Doncic")).toBeLessThan(
      indexOfRow(strings.game.boxScore.groups.bench),
    );
    expect(indexOfRow(strings.game.boxScore.groups.bench)).toBeLessThan(
      indexOfRow("Looney"),
    );
    expect(indexOfRow("Looney")).toBeLessThan(
      indexOfRow(strings.game.boxScore.groups.didNotPlay),
    );
    expect(indexOfRow("Vanderbilt")).toBe(rowTexts.length - 2);
    expect(rowTexts.at(-1)).toContain(strings.game.boxScore.totals);
  });

  it("keeps the picked team while a live game refetches", async () => {
    await renderLoadedGameDetail(liveSummary, DURING_LIVE_GAME);
    fetchMock.mockResolvedValue(jsonResponse(liveSummary));

    fireEvent.click(teamButton("76ers"));
    await waitOnePollingInterval();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(teamButton("76ers").getAttribute("aria-pressed")).toBe("true");
  });
});
