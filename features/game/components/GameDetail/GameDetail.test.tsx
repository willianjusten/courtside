import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import finalSummary from "@/lib/espn/__fixtures__/summary-final.json";
import finalVideosSummary from "@/lib/espn/__fixtures__/summary-final-videos.json";
import overtimeSummary from "@/lib/espn/__fixtures__/summary-final-overtime-playoff.json";
import liveSummary from "@/lib/espn/__fixtures__/summary-live.json";
import preGameSummary from "@/lib/espn/__fixtures__/summary-pre-game.json";
import { makeQueryClient } from "@/lib/query/make-query-client";
import { strings } from "@/lib/strings";
import GameDetail from "@/features/game/components/GameDetail";

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

// Tailwind's md breakpoint, where the desktop layout starts.
const DESKTOP_MEDIA_QUERY = "(min-width: 48rem)";

function setViewport(viewport: "mobile" | "desktop") {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: viewport === "desktop" && query === DESKTOP_MEDIA_QUERY,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

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

describe("GameDetail team stats", () => {
  const statRow = (label: string) =>
    within(screen.getByRole("region", { name: strings.game.teamStats.title }))
      .getAllByRole("listitem")
      .find((item) => within(item).queryByText(label));
  const emphasizedValuesOf = (label: string) =>
    Array.from(statRow(label)?.querySelectorAll("strong") ?? []).map(
      (value) => value.textContent,
    );

  it("shows each statistic side by side, emphasizing the better value", async () => {
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    expect(statRow("FG%")?.textContent).toBe("41%FG%57%");
    expect(emphasizedValuesOf("FG%")).toEqual(["57%"]);
    expect(emphasizedValuesOf("Turnovers")).toEqual(["16"]);
  });

  it("emphasizes neither value on a tie", async () => {
    const tiedSummary = structuredClone(finalSummary);
    for (const team of tiedSummary.boxscore.teams) {
      const steals = team.statistics.find(({ name }) => name === "steals");
      if (steals) steals.displayValue = "9";
    }
    await renderLoadedGameDetail(tiedSummary, DURING_LIVE_GAME);

    expect(emphasizedValuesOf("Steals")).toEqual([]);
  });
});

describe("GameDetail game flow", () => {
  const flowRegion = () =>
    screen.getByRole("region", { name: strings.game.flow.title });
  const modeButton = (name: string) =>
    within(flowRegion()).queryByRole("button", { name });
  const statOf = (label: string) =>
    within(flowRegion()).getByText(label).nextElementSibling?.textContent;

  it("charts the margin with a text summary for screen readers", async () => {
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    expect(
      within(flowRegion()).getByText(
        "Score margin chart. Largest lead: Golden State Warriors 3, Los Angeles Lakers 27. 4 lead changes. Los Angeles Lakers won by 22.",
      ).className,
    ).toContain("sr-only");
    expect(within(flowRegion()).getByText("LAL leads ↑ +30")).toBeDefined();
    expect(within(flowRegion()).getByText("GS leads ↓ +30")).toBeDefined();
    expect(within(flowRegion()).getByText("LAL won by 22")).toBeDefined();
    expect(
      Array.from(flowRegion().querySelectorAll("path")).map((path) =>
        path.getAttribute("fill"),
      ),
    ).toHaveLength(3);
  });

  it("shows the largest lead per team, the lead changes, the times tied, and the best run", async () => {
    await renderLoadedGameDetail(overtimeSummary, DURING_LIVE_GAME);

    expect(statOf(strings.game.flow.stats.largestLead)).toBe("LAL 15 · HOU 6");
    expect(statOf(strings.game.flow.stats.leadChanges)).toBe("8");
    expect(statOf(strings.game.flow.stats.timesTied)).toBe("8");
    expect(statOf(strings.game.flow.stats.bestRun)).toBe(
      "LAL 13-221-21 to 34-23",
    );
  });

  it("switches to the win probability with a pressed-state toggle", async () => {
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    const lead = modeButton(strings.game.flow.modes.lead);
    const winProbability = modeButton(strings.game.flow.modes.winProbability);
    expect(lead?.getAttribute("aria-pressed")).toBe("true");
    expect(winProbability?.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(winProbability as HTMLElement);

    expect(winProbability?.getAttribute("aria-pressed")).toBe("true");
    expect(within(flowRegion()).getByText("LAL 100%")).toBeDefined();
    expect(within(flowRegion()).getByText("GS 100%")).toBeDefined();
    expect(
      within(flowRegion()).getByText(strings.game.flow.winProbability),
    ).toBeDefined();
  });

  it("hides the toggle when ESPN has no win probability", async () => {
    await renderLoadedGameDetail(
      { ...finalSummary, winprobability: [] },
      DURING_LIVE_GAME,
    );

    expect(modeButton(strings.game.flow.modes.lead)).toBeNull();
    expect(modeButton(strings.game.flow.modes.winProbability)).toBeNull();
    expect(within(flowRegion()).getByText("LAL leads ↑ +30")).toBeDefined();
  });

  it("turns the chart's reveal off for fans who prefer reduced motion", async () => {
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    expect(flowRegion().querySelector("svg")?.getAttribute("class")).toContain(
      "motion-reduce:animate-none",
    );
  });

  it("notes that the game flow fills in before the first play", async () => {
    await renderLoadedGameDetail(
      { ...liveSummary, plays: [] },
      DURING_LIVE_GAME,
    );

    expect(
      within(flowRegion()).getByText(strings.game.flow.empty),
    ).toBeDefined();
  });
});

describe("GameDetail game leaders", () => {
  it("shows the game's points, rebounds, and assists leaders with their team and headshot", async () => {
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    const leaders = screen.getByRole("region", {
      name: strings.game.leaders.title,
    });

    expect(
      within(leaders)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "PointsL. Doncic · LAL28",
      "ReboundsW. Kessler · LAL9",
      "AssistsD. Green · GS8",
    ]);
    expect(
      within(leaders)
        .getByRole("img", { name: "W. Kessler" })
        .getAttribute("src"),
    ).toContain("4433136.png");
  });

  it("shows both players when the game's leaders tie", async () => {
    const tiedSummary = structuredClone(finalSummary);
    const lakersPoints = tiedSummary.leaders
      .find(({ team }) => team.abbreviation === "LAL")
      ?.leaders.find(({ name }) => name === "points")?.leaders[0];
    if (!lakersPoints) throw new Error("Expected the Lakers points leader");
    lakersPoints.value = 23;
    lakersPoints.displayValue = "23";
    await renderLoadedGameDetail(tiedSummary, DURING_LIVE_GAME);

    const points = within(
      screen.getByRole("region", { name: strings.game.leaders.title }),
    ).getAllByRole("listitem")[0];

    expect(points.textContent).toBe("PointsS. Curry · GSL. Doncic · LAL23");
    expect(within(points).getAllByRole("img")).toHaveLength(2);
  });
});

describe("GameDetail play-by-play", () => {
  const ROW_HEIGHT = 40;

  beforeEach(() => {
    window.scrollTo(0, 0);
  });

  const playsRegion = () =>
    screen.getByRole("region", { name: strings.game.plays.title });
  const playRows = () => within(playsRegion()).getAllByRole("listitem");
  const periodButton = (name: string) =>
    within(playsRegion()).getByRole("button", { name });

  it("lists the plays newest first with the team logo, period and clock, description, and score", async () => {
    setViewport("mobile");
    window.history.replaceState(null, "", `/game/${GAME_ID}?tab=plays`);
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    const rows = playRows();
    expect(rows).toHaveLength(50);
    expect(rows[0].textContent).toBe("Q4 0.0End of Game105-130");
    const dunk = rows.find((row) =>
      row.textContent?.includes("3-foot alley oop"),
    );
    expect(dunk?.textContent).toBe(
      "Q1 11:39Walker Kessler makes 3-foot alley oop dunk (Luka Doncic assists)0-2",
    );
    expect(
      within(dunk as HTMLElement)
        .getByRole("img")
        .getAttribute("alt"),
    ).toBe("Los Angeles Lakers");
  });

  it("emphasizes the scoring plays", async () => {
    setViewport("mobile");
    window.history.replaceState(null, "", `/game/${GAME_ID}?tab=plays`);
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    const scoringRows = playRows().filter((row) => row.querySelector("strong"));
    expect(scoringRows).toHaveLength(13);
    expect(scoringRows[0].textContent).toContain("105-130");
  });

  it("filters the plays by period with pressed-state buttons", async () => {
    setViewport("mobile");
    window.history.replaceState(null, "", `/game/${GAME_ID}?tab=plays`);
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    expect(
      periodButton(strings.game.plays.allPeriods).getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(periodButton("Q1"));

    expect(periodButton("Q1").getAttribute("aria-pressed")).toBe("true");
    expect(playRows()).toHaveLength(40);
    expect(playRows().every((row) => row.textContent?.startsWith("Q1"))).toBe(
      true,
    );

    fireEvent.click(periodButton(strings.game.plays.allPeriods));
    expect(playRows()).toHaveLength(50);
  });

  it("loads the Plays tab on mobile only once it is opened", async () => {
    setViewport("mobile");
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    expect(
      screen.queryByRole("region", { name: strings.game.plays.title }),
    ).toBeNull();

    fireEvent.mouseDown(
      screen.getByRole("tab", { name: strings.game.tabs.plays }),
    );
    expect(playRows()).toHaveLength(50);
  });

  it("shows the 6 most recent plays on desktop and expands to the full feed", async () => {
    setViewport("desktop");
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    expect(playRows()).toHaveLength(6);
    expect(playRows()[0].textContent).toContain("End of Game");
    const toggle = within(playsRegion()).getByRole("button", {
      name: strings.game.plays.showAll(50),
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      document.getElementById(toggle.getAttribute("aria-controls") ?? ""),
    ).toBe(within(playsRegion()).getByRole("list"));

    fireEvent.click(toggle);
    expect(playRows()).toHaveLength(50);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toBe(strings.game.plays.showFewer);

    fireEvent.click(toggle);
    expect(playRows()).toHaveLength(6);
  });

  it("collapses the desktop feed again when another period is picked", async () => {
    setViewport("desktop");
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    fireEvent.click(
      within(playsRegion()).getByRole("button", {
        name: strings.game.plays.showAll(50),
      }),
    );
    fireEvent.click(periodButton("Q1"));

    expect(playRows()).toHaveLength(6);
    expect(
      within(playsRegion()).getByRole("button", {
        name: strings.game.plays.showAll(40),
      }),
    ).toBeDefined();
  });

  it("keeps the rows being read in place when new plays arrive", async () => {
    setViewport("mobile");
    // Lays the rows out one under another, with the feed starting 1000px down the page.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const feedTop = 1000 - window.scrollY;
        if (this.tagName === "OL") {
          return {
            top: feedTop,
            bottom: feedTop + this.children.length * ROW_HEIGHT,
          } as DOMRect;
        }
        const rowIndex = Array.from(this.parentElement?.children ?? []).indexOf(
          this,
        );
        return { top: feedTop + rowIndex * ROW_HEIGHT } as DOMRect;
      },
    );
    window.history.replaceState(null, "", `/game/${GAME_ID}?tab=plays`);
    await renderLoadedGameDetail(liveSummary, DURING_LIVE_GAME);
    act(() => {
      window.scrollTo(0, 1200);
      window.dispatchEvent(new Event("scroll"));
    });

    const newestPlay = liveSummary.plays.at(-1);
    fetchMock.mockResolvedValue(
      jsonResponse({
        ...liveSummary,
        plays: [
          ...liveSummary.plays,
          {
            ...newestPlay,
            id: "new-play-1",
            text: "Joel Embiid makes free throw 1 of 2",
          },
          {
            ...newestPlay,
            id: "new-play-2",
            text: "Joel Embiid makes free throw 2 of 2",
          },
        ],
      }),
    );
    await waitOnePollingInterval();

    expect(playRows()[0].textContent).toContain("free throw 2 of 2");
    expect(window.scrollY).toBe(1200 + 2 * ROW_HEIGHT);
  });

  it("leaves the page where it is when new plays arrive above the fold", async () => {
    setViewport("mobile");
    window.history.replaceState(null, "", `/game/${GAME_ID}?tab=plays`);
    await renderLoadedGameDetail(liveSummary, DURING_LIVE_GAME);

    const newestPlay = liveSummary.plays.at(-1);
    fetchMock.mockResolvedValue(
      jsonResponse({
        ...liveSummary,
        plays: [...liveSummary.plays, { ...newestPlay, id: "new-play-1" }],
      }),
    );
    await waitOnePollingInterval();

    expect(playRows()).toHaveLength(41);
    expect(window.scrollY).toBe(0);
  });
});

describe("GameDetail highlights", () => {
  const finalWithVideos = {
    ...finalSummary,
    videos: finalVideosSummary.videos,
  };
  const [recap, firstClip] = finalVideosSummary.videos;
  const highlights = strings.game.highlights;

  const highlightsRegion = () =>
    screen.getByRole("region", { name: highlights.title });
  const videoButtons = () =>
    within(
      within(highlightsRegion()).getByRole("list", { name: highlights.videos }),
    ).getAllByRole("button");
  const player = () => {
    const video = highlightsRegion().querySelector("video");
    if (!video) throw new Error("Expected the video player");
    return video;
  };

  async function renderHighlights(viewport: "mobile" | "desktop") {
    setViewport(viewport);
    await renderLoadedGameDetail(finalWithVideos, DURING_LIVE_GAME);
    // The player is loaded on demand.
    await within(highlightsRegion()).findByRole("button", {
      name: highlights.play(recap.headline),
    });
  }

  it("hides the section when ESPN has no video", async () => {
    setViewport("mobile");
    await renderLoadedGameDetail(finalSummary, DURING_LIVE_GAME);

    expect(screen.queryByRole("region", { name: highlights.title })).toBeNull();
  });

  it("sits in the Summary tab on mobile", async () => {
    await renderHighlights("mobile");

    expect(
      screen
        .getByRole("tabpanel", { name: strings.game.tabs.summary })
        .contains(highlightsRegion()),
    ).toBe(true);
  });

  it("loads the first video in a single player that downloads nothing until played", async () => {
    await renderHighlights("mobile");

    expect(highlightsRegion().querySelectorAll("video")).toHaveLength(1);
    expect(player().getAttribute("src")).toBe(recap.links.source.HD.href);
    expect(player().getAttribute("poster")).toBe(recap.thumbnail);
    expect(player().getAttribute("preload")).toBe("none");
    expect(highlightsRegion().textContent).toContain("11 videos");
    expect(highlightsRegion().textContent).toContain(recap.headline);
  });

  it("plays the video in the page from the play button", async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    await renderHighlights("mobile");

    fireEvent.click(
      within(highlightsRegion()).getByRole("button", {
        name: highlights.play(recap.headline),
      }),
    );
    fireEvent.play(player());

    expect(play).toHaveBeenCalledTimes(1);
    expect(player().hasAttribute("controls")).toBe(true);
    expect(
      within(highlightsRegion()).queryByRole("button", {
        name: highlights.play(recap.headline),
      }),
    ).toBeNull();
  });

  it("lists the videos in ESPN order with title and duration, collapsed to 3 on mobile", async () => {
    await renderHighlights("mobile");

    expect(videoButtons()).toHaveLength(3);
    expect(videoButtons()[0].textContent).toBe(`${recap.headline}1:12`);
    expect(videoButtons()[1].textContent).toBe(`${firstClip.headline}0:19`);
    expect(videoButtons()[0].getAttribute("aria-current")).toBe("true");
    expect(videoButtons()[1].hasAttribute("aria-current")).toBe(false);
  });

  it("expands the list with View more without playing anything", async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    await renderHighlights("mobile");

    const toggle = within(highlightsRegion()).getByRole("button", {
      name: highlights.viewMore,
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      document.getElementById(toggle.getAttribute("aria-controls") ?? ""),
    ).toBe(
      within(highlightsRegion()).getByRole("list", { name: highlights.videos }),
    );

    fireEvent.click(toggle);
    expect(videoButtons()).toHaveLength(11);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.textContent).toBe(highlights.viewLess);
    expect(play).not.toHaveBeenCalled();
    expect(player().getAttribute("src")).toBe(recap.links.source.HD.href);

    fireEvent.click(toggle);
    expect(videoButtons()).toHaveLength(3);
  });

  it("collapses the list to 4 on desktop", async () => {
    await renderHighlights("desktop");

    expect(videoButtons()).toHaveLength(4);
  });

  it("plays a picked video in the same player and highlights it", async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockResolvedValue(undefined);
    await renderHighlights("mobile");
    const video = player();

    fireEvent.click(videoButtons()[1]);

    expect(player()).toBe(video);
    expect(video.getAttribute("src")).toBe(firstClip.links.source.HD.href);
    expect(video.getAttribute("poster")).toBe(firstClip.thumbnail);
    expect(play).toHaveBeenCalledTimes(1);
    expect(videoButtons()[1].getAttribute("aria-current")).toBe("true");
    expect(videoButtons()[0].hasAttribute("aria-current")).toBe(false);
    expect(highlightsRegion().textContent).toContain(firstClip.headline);
  });
});
