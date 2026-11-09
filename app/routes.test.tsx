import {
  fireEvent,
  render as renderWithoutProviders,
  screen,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import Providers from "./providers";
import { favoritesStore } from "@/app/lib/favorites/use-favorite-team-ids";
import { leadersQueryOptions } from "@/app/lib/queries/leaders";
import { standingsQueryOptions } from "@/app/lib/queries/standings";
import {
  teamLeadersQueryOptions,
  teamRosterQueryOptions,
  teamSchedulesQueryOptions,
} from "@/app/lib/queries/team";
import { getQueryClient } from "@/app/lib/query/get-query-client";
import { strings } from "@/app/lib/strings";
import { withApiRoutes } from "@/app/test-utils/api-routes";
import HomePage from "./page";
import GamesPage from "./games/[date]/page";
import GamePage from "./game/[id]/page";
import StandingsPage from "./standings/page";
import TeamPage from "./teams/[slug]/page";
import PlayoffsPage from "./playoffs/page";
import finalDay from "./lib/espn/__fixtures__/scoreboard-final-day.json";
import headerWeek from "./lib/espn/__fixtures__/scoreboard-header-week.json";
import teamsList from "./lib/espn/__fixtures__/teams-list.json";
import lakersDetail from "./lib/espn/__fixtures__/team-detail-lakers.json";
import lakersSchedule from "./lib/espn/__fixtures__/team-schedule-lakers.json";
import lakersPostseasonSchedule from "./lib/espn/__fixtures__/team-schedule-lakers-postseason.json";
import lakersRoster from "./lib/espn/__fixtures__/team-roster-lakers.json";
import lakersInjuries from "./lib/espn/__fixtures__/team-injuries-lakers.json";
import lakersInjuryItems from "./lib/espn/__fixtures__/team-injuries-lakers-items.json";
import lakersLiveScoreboard from "./lib/espn/__fixtures__/scoreboard-lakers-live-simulated.json";
import standings from "./lib/espn/__fixtures__/standings-regular-season.json";
import currentSeason from "./lib/espn/__fixtures__/season-current.json";
import regularSeasonLeaders from "./lib/espn/__fixtures__/leaders-regular-season.json";
import leaderAthletes from "./lib/espn/__fixtures__/leaders-athletes.json";
import lakersLeaders from "./lib/espn/__fixtures__/team-leaders-lakers.json";
import lakersLeaderAthletes from "./lib/espn/__fixtures__/team-leaders-lakers-athletes.json";
import finalSummary from "./lib/espn/__fixtures__/summary-final.json";
import liveSummary from "./lib/espn/__fixtures__/summary-live.json";
import preGameSummary from "./lib/espn/__fixtures__/summary-pre-game.json";

const LEADERS_URL_PATTERN = /\/types\/2\/leaders\?limit=5$/;
const ATHLETE_URL_PATTERN = /\/athletes\/(\d+)$/;
const INJURY_URL_PATTERN = /\/injuries\/(-?\d+)$/;
const FINAL_GAME_ID = "401909092";
const LIVE_GAME_ID = "401909093";
const PRE_GAME_ID = "401909094";
const LAKERS_TEAM_ID = "13";

// The sidebar is an async server component, which the client renderer here cannot render; it has its own tests.
vi.mock("./components/HomeSidebar", () => ({ default: () => null }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => window.location.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

function espnFixtureFor(url: string) {
  if (url.endsWith(`/summary?event=${FINAL_GAME_ID}`)) return finalSummary;
  if (url.endsWith(`/summary?event=${LIVE_GAME_ID}`)) return liveSummary;
  if (url.endsWith(`/summary?event=${PRE_GAME_ID}`)) return preGameSummary;
  if (url.includes("/scoreboard/header?")) return headerWeek;
  if (url.endsWith("/teams/13/schedule?seasontype=2")) return lakersSchedule;
  // While the season under way is still in its regular season, its postseason schedule has no games.
  if (url.endsWith("/teams/13/schedule?seasontype=3"))
    return { ...lakersSchedule, events: [] };
  if (url.endsWith("/teams/13/roster")) return lakersRoster;
  if (url.endsWith("/teams/13/injuries")) return lakersInjuries;
  if (url.endsWith("/teams/13/leaders?limit=3")) return lakersLeaders;
  const injuryId = url.match(INJURY_URL_PATTERN)?.[1];
  if (injuryId)
    return lakersInjuryItems[injuryId as keyof typeof lakersInjuryItems];
  if (url.endsWith("/teams/13")) return lakersDetail;
  if (url.endsWith("/teams")) return teamsList;
  if (url.endsWith("/standings?seasontype=2")) return standings;
  if (url.endsWith("/leagues/nba/season")) return currentSeason;
  if (LEADERS_URL_PATTERN.test(url)) return regularSeasonLeaders;
  const athleteId = url.match(ATHLETE_URL_PATTERN)?.[1];
  if (athleteId)
    return (
      leaderAthletes[athleteId as keyof typeof leaderAthletes] ??
      lakersLeaderAthletes[athleteId as keyof typeof lakersLeaderAthletes]
    );
  return finalDay;
}

// The client reads everything but live games through the app's route handlers, which answer from the ESPN fixtures.
const responseFor = withApiRoutes((url) => Response.json(espnFixtureFor(url)));

function render(ui: ReactElement) {
  return renderWithoutProviders(ui, { wrapper: Providers });
}

describe("routes", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => responseFor(url)),
    );
  });

  afterEach(() => {
    // The browser keeps one query client for the session, and the standings tests each answer ESPN differently.
    getQueryClient().removeQueries({
      queryKey: leadersQueryOptions().queryKey,
    });
    getQueryClient().removeQueries({
      queryKey: standingsQueryOptions().queryKey,
    });
    // The team page test answers the scoreboard with a live Lakers game, which would otherwise keep polling.
    getQueryClient().removeQueries({ queryKey: ["scoreboard"] });
    // The playoffs test answers the postseason schedule with the Lakers' playoff run.
    getQueryClient().removeQueries({
      queryKey: teamSchedulesQueryOptions(LAKERS_TEAM_ID).queryKey,
    });
    // The team leaders retry test answers the team leaders with an error first.
    getQueryClient().removeQueries({
      queryKey: teamLeadersQueryOptions(LAKERS_TEAM_ID).queryKey,
    });
    // The roster retry test answers the roster with an error first.
    getQueryClient().removeQueries({
      queryKey: teamRosterQueryOptions(LAKERS_TEAM_ID).queryKey,
    });
    favoritesStore().remove(LAKERS_TEAM_ID);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  it("renders the home page with the current NBA date's heading, summary, and games", async () => {
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-10-21T16:00:00Z"),
    });
    render(await HomePage());
    vi.useRealTimers();

    expect(
      screen.getByRole("heading", { name: "Wednesday, October 21" }),
    ).toBeDefined();
    expect(await screen.findByText("3 games · 3 final")).toBeDefined();
    expect(screen.getByText("Magic")).toBeDefined();
  });

  it("renders the games page with the requested date's heading, summary, and games", async () => {
    window.history.replaceState(null, "", "/games/2026-10-21");
    render(
      await GamesPage({ params: Promise.resolve({ date: "2026-10-21" }) }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Wednesday, October 21",
      }),
    ).toBeDefined();
    expect(await screen.findByText("3 games · 3 final")).toBeDefined();
    expect(screen.getByText("Magic")).toBeDefined();
  });

  it("renders the date rail with the server-prefetched game counts", async () => {
    window.history.replaceState(null, "", "/games/2026-10-21");
    render(
      await GamesPage({ params: Promise.resolve({ date: "2026-10-21" }) }),
    );

    const dateRail = screen.getByRole("group", {
      name: strings.dateRail.label,
    });
    expect(
      within(dateRail)
        .getByRole("button", {
          name: "Wednesday, October 21, 11 games",
        })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("returns not found for an invalid games date", async () => {
    await expect(
      GamesPage({ params: Promise.resolve({ date: "2026-02-30" }) }),
    ).rejects.toThrow();
  });

  it("returns not found for a game id that is not an ESPN event id", async () => {
    await expect(
      GamePage({ params: Promise.resolve({ id: "not-a-game" }) }),
    ).rejects.toThrow();
  });

  it("returns not found for a game ESPN does not know", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 404 })),
    );

    await expect(
      GamePage({ params: Promise.resolve({ id: "1" }) }),
    ).rejects.toThrow();
  });

  it("renders a final game with its score, status, channel, venue, and leaders", async () => {
    render(await GamePage({ params: Promise.resolve({ id: FINAL_GAME_ID }) }));

    expect(
      await screen.findByRole("heading", {
        name: strings.game.title("Golden State Warriors", "Los Angeles Lakers"),
      }),
    ).toBeDefined();
    // The mobile top bar and the desktop header each carry the status, channel, and venue; CSS shows one of them.
    expect(screen.getAllByText(strings.gameStatus.final)).not.toHaveLength(0);
    expect(screen.getAllByText("ESPN")).not.toHaveLength(0);
    expect(
      screen.getAllByText("crypto.com Arena · Los Angeles"),
    ).not.toHaveLength(0);
    expect(
      screen
        .getAllByRole("link", {
          name: "Back to games on Wednesday, October 21",
        })
        .map((link) => link.getAttribute("href")),
    ).toContain("/games/2026-10-21");
    const leaders = screen.getByRole("region", {
      name: strings.game.leaders.title,
    });
    expect(within(leaders).getByText("L. Doncic · LAL")).toBeDefined();
  });

  it("links both teams in the header to their team pages", async () => {
    render(await GamePage({ params: Promise.resolve({ id: FINAL_GAME_ID }) }));

    expect(
      (
        await screen.findByRole("link", { name: /Golden State Warriors/ })
      ).getAttribute("href"),
    ).toBe("/teams/warriors");
    expect(
      screen
        .getByRole("link", { name: /Los Angeles Lakers/ })
        .getAttribute("href"),
    ).toBe("/teams/lakers");
  });

  it("shows the line score per period with each team's total", async () => {
    render(await GamePage({ params: Promise.resolve({ id: FINAL_GAME_ID }) }));

    const lineScore = await screen.findByRole("table", {
      name: strings.game.lineScore.title,
    });
    const lakersRow = within(lineScore).getByRole("row", { name: /LAL/ });
    expect(
      within(lakersRow)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["34", "32", "36", "25", "127"]);
  });

  it("shows each team's box score", async () => {
    render(await GamePage({ params: Promise.resolve({ id: FINAL_GAME_ID }) }));

    const boxScore = await screen.findByRole("region", {
      name: strings.game.boxScore.title,
    });
    expect(
      within(boxScore).getByRole("table", {
        name: strings.game.boxScore.caption("Warriors"),
      }),
    ).toBeDefined();

    fireEvent.click(within(boxScore).getByRole("button", { name: "Lakers" }));

    const lakersTable = within(boxScore).getByRole("table", {
      name: strings.game.boxScore.caption("Lakers"),
    });
    expect(
      within(lakersTable).getByRole("row", { name: /Z\. Williams/ }),
    ).toBeDefined();
    expect(
      within(lakersTable).getByText(
        strings.game.boxScore.didNotPlayReason("COACH'S DECISION"),
      ),
    ).toBeDefined();
  });

  it("shows the plays and the game flow", async () => {
    render(await GamePage({ params: Promise.resolve({ id: FINAL_GAME_ID }) }));

    const plays = await screen.findByRole("region", {
      name: strings.game.plays.title,
    });
    // Desktop previews the most recent plays, newest first.
    expect(within(plays).getAllByRole("listitem")).toHaveLength(6);
    expect(within(plays).getByText("End of Game")).toBeDefined();
    expect(
      within(plays).getByRole("button", {
        name: strings.game.plays.showAll(50),
      }),
    ).toBeDefined();
    const gameFlow = screen.getByRole("region", {
      name: strings.game.flow.title,
    });
    expect(within(gameFlow).getByText("LAL won by 22")).toBeDefined();
  });

  it("renders a live game with its period, clock, and latest plays", async () => {
    render(await GamePage({ params: Promise.resolve({ id: LIVE_GAME_ID }) }));

    expect(
      await screen.findByRole("heading", {
        name: strings.game.title("Cleveland Cavaliers", "Philadelphia 76ers"),
      }),
    ).toBeDefined();
    expect(screen.getByText("Q1 6:44")).toBeDefined();
    const plays = screen.getByRole("region", {
      name: strings.game.plays.title,
    });
    const latestPlay = within(plays).getAllByRole("listitem")[0];
    expect(latestPlay?.textContent).toContain("Joel Embiid defensive rebound");
  });

  it("renders a game that has not started yet with a note instead of the game details", async () => {
    render(await GamePage({ params: Promise.resolve({ id: PRE_GAME_ID }) }));

    expect(
      await screen.findByRole("heading", {
        name: strings.game.title("Denver Nuggets", "Oklahoma City Thunder"),
      }),
    ).toBeDefined();
    expect(screen.getByText(strings.game.preGameNote)).toBeDefined();
    expect(
      screen.queryByRole("table", { name: strings.game.lineScore.title }),
    ).toBeNull();
    expect(
      screen.queryByRole("region", { name: strings.game.plays.title }),
    ).toBeNull();
  });

  it("renders the standings page for the current season", async () => {
    render(await StandingsPage());

    expect(
      screen.getByRole("heading", { name: strings.standings.title }),
    ).toBeDefined();
    expect(await screen.findByText("SEASON 2026–27")).toBeDefined();
  });

  it("opens on the Western Conference standings in seed order", async () => {
    render(await StandingsPage());

    const west = await screen.findByRole("region", {
      name: strings.standings.conferenceTable("Western Conference"),
    });
    const [, leaderRow] = within(west).getAllByRole("row");
    expect(within(west).getAllByRole("row")).toHaveLength(16);
    expect(
      within(leaderRow).getByRole("link", { name: /Minnesota Timberwolves/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "West" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("restores the conference kept in the URL", async () => {
    window.history.replaceState(null, "", "/standings?conf=east");
    render(await StandingsPage());

    expect(
      await screen.findByRole("region", {
        name: strings.standings.conferenceTable("Eastern Conference"),
      }),
    ).toBeDefined();
  });

  it("shows each team's standings columns", async () => {
    render(await StandingsPage());

    const leaderRow = await screen.findByRole("row", {
      name: /Minnesota Timberwolves/,
    });
    expect(
      within(leaderRow)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["1", "1-0", "1.000", "-", "0-0", "1-0", "1-0", "W1", "+25.0"]);
    expect(within(leaderRow).getByText(/Playoff zone/)).toBeDefined();
  });

  it("links each standings team to its team page", async () => {
    render(await StandingsPage());

    expect(
      (
        await screen.findByRole("link", { name: /Minnesota Timberwolves/ })
      ).getAttribute("href"),
    ).toBe("/teams/timberwolves");
  });

  it.each([
    ["points", "Ty Jerome", "MEM", "36.5"],
    ["rebounds", "Domantas Sabonis", "SAC", "18.5"],
    ["assists", "Trae Young", "WSH", "12.5"],
  ] as const)(
    "shows the %s leaders with player names, teams, and values",
    async (stat, topPlayerName, teamAbbreviation, topValue) => {
      render(await StandingsPage());

      const category = await screen.findByRole("region", {
        name: strings.standings.leaders.categories[stat],
      });
      const [topLeader] = within(category).getAllByRole("listitem");
      expect(within(category).getAllByRole("listitem")).toHaveLength(5);
      expect(within(topLeader).getByText(topPlayerName)).toBeDefined();
      expect(within(topLeader).getByText(teamAbbreviation)).toBeDefined();
      expect(within(topLeader).getByText(topValue)).toBeDefined();
    },
  );

  it("hides the percentage leaders early in the season and says why", async () => {
    render(await StandingsPage());

    expect(
      await screen.findByText(strings.standings.leaders.percentagesHidden),
    ).toBeDefined();
    expect(
      screen.queryByRole("region", {
        name: strings.standings.leaders.categories.fieldGoalPercentage,
      }),
    ).toBeNull();
    expect(
      screen.getByRole("region", {
        name: strings.standings.leaders.categories.threesMade,
      }),
    ).toBeDefined();
  });

  it("restores the leaders view kept in the URL", async () => {
    window.history.replaceState(null, "", "/standings?view=leaders");
    render(await StandingsPage());

    const viewSwitch = await screen.findByRole("group", {
      name: strings.standings.views.label,
    });
    expect(
      within(viewSwitch)
        .getByRole("button", { name: strings.standings.views.leaders })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("keeps the view picked on the switch in the URL", async () => {
    window.history.replaceState(null, "", "/standings?conf=east");
    render(await StandingsPage());

    const viewSwitch = await screen.findByRole("group", {
      name: strings.standings.views.label,
    });
    fireEvent.click(
      within(viewSwitch).getByRole("button", {
        name: strings.standings.views.leaders,
      }),
    );

    expect(window.location.search).toBe("?view=leaders&conf=east");
  });

  it("shows that there are no leaders yet before the regular season has stats", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        LEADERS_URL_PATTERN.test(url)
          ? new Response(
              JSON.stringify({
                error: { message: "No stats found.", code: 404 },
              }),
              { status: 404 },
            )
          : responseFor(url),
      ),
    );

    render(await StandingsPage());

    expect(await screen.findAllByText(strings.leaders.empty)).toHaveLength(6);
  });

  it("shows an error only in the leaders category whose players cannot be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/athletes/4065733")
          ? new Response(null, { status: 500 })
          : responseFor(url),
      ),
    );

    render(await StandingsPage());

    const points = await screen.findByRole("region", {
      name: strings.standings.leaders.categories.points,
    });
    const rebounds = screen.getByRole("region", {
      name: strings.standings.leaders.categories.rebounds,
    });
    expect(
      within(points).getByText(strings.leaders.categoryError),
    ).toBeDefined();
    expect(within(rebounds).getAllByRole("listitem")).toHaveLength(5);
  });

  it("still shows the standings when the leaders cannot be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        LEADERS_URL_PATTERN.test(url)
          ? new Response(null, { status: 500 })
          : responseFor(url),
      ),
    );

    render(await StandingsPage());

    expect(
      await screen.findByText(strings.leaders.error, undefined, {
        // The client retries the failed leaders once, a second later.
        timeout: 3000,
      }),
    ).toBeDefined();
    expect(
      await screen.findByRole("region", {
        name: strings.standings.conferenceTable("Western Conference"),
      }),
    ).toBeDefined();
  });

  it("loads the standings again from the error state's Try again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let isEspnDown = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        isEspnDown && url.endsWith("/standings?seasontype=2")
          ? new Response(null, { status: 500 })
          : responseFor(url),
      ),
    );

    render(await StandingsPage());

    const tryAgain = await screen.findByRole(
      "button",
      { name: strings.common.retry },
      // The client retries the failed standings once, a second later.
      { timeout: 3000 },
    );
    expect(screen.getByText(strings.standings.error)).toBeDefined();

    isEspnDown = false;
    fireEvent.click(tryAgain);

    expect(
      await screen.findByRole("region", {
        name: strings.standings.conferenceTable("Western Conference"),
      }),
    ).toBeDefined();
    expect(screen.queryByText(strings.standings.error)).toBeNull();
  });

  it("renders the team page for the requested slug", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    expect(
      await screen.findByRole("heading", { name: "Los Angeles Lakers" }),
    ).toBeDefined();
    expect(screen.getByText("4th West")).toBeDefined();
    expect(screen.getByText("W1")).toBeDefined();
  });

  it("shows the team's home, away, and last 10 records", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const tiles = await screen.findByLabelText(strings.team.tiles.label);
    expect(
      within(tiles)
        .getAllByRole("definition")
        .map((tile) => tile.textContent),
    ).toEqual(["1-0", "0-0", "1-0"]);
  });

  it("opens on the schedule tab and keeps the picked tab in the URL", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    expect(
      (
        await screen.findByRole("tab", { name: strings.team.tabs.schedule })
      ).getAttribute("aria-selected"),
    ).toBe("true");

    fireEvent.mouseDown(
      screen.getByRole("tab", { name: strings.team.tabs.roster }),
    );

    expect(window.location.search).toBe("?tab=roster");
  });

  it("restores the tab from the URL", async () => {
    window.history.replaceState(null, "", "/teams/lakers?tab=roster");
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    expect(
      (
        await screen.findByRole("tab", { name: strings.team.tabs.roster })
      ).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("loads the roster again from its error state's Try again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let isEspnDown = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        isEspnDown && url.endsWith("/teams/13/roster")
          ? new Response(null, { status: 500 })
          : responseFor(url),
      ),
    );

    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const tryAgain = await screen.findByRole(
      "button",
      { name: strings.common.retry },
      // The client retries the failed roster once, a second later.
      { timeout: 3000 },
    );
    expect(screen.getByText(strings.team.roster.error)).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Los Angeles Lakers" }),
    ).toBeDefined();

    isEspnDown = false;
    fireEvent.click(tryAgain);

    expect(
      await screen.findByRole("region", { name: strings.team.roster.title }),
    ).toBeDefined();
    expect(screen.queryByText(strings.team.roster.error)).toBeNull();
  });

  it("returns not found for a slug that names no team", async () => {
    await expect(
      TeamPage({ params: Promise.resolve({ slug: "not-a-team" }) }),
    ).rejects.toThrow();
  });

  it("finds a team by its hyphenated slug", async () => {
    await expect(
      TeamPage({ params: Promise.resolve({ slug: "trail-blazers" }) }),
    ).resolves.toBeDefined();
  });

  it("lists the team's results with W/L announced in full and a game center link", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const results = await screen.findByRole("region", {
      name: strings.team.schedule.results,
    });
    const resultLink = within(results).getByRole("link");
    expect(within(results).getAllByRole("listitem")).toHaveLength(1);
    expect(resultLink.getAttribute("href")).toBe(`/game/${FINAL_GAME_ID}`);
    expect(resultLink.textContent).toContain("Golden State Warriors");
    expect(resultLink.textContent).toContain("127-105");
    expect(
      within(resultLink)
        .getByText(strings.team.schedule.outcomes.win.label)
        .getAttribute("aria-hidden"),
    ).toBe("true");
    expect(
      within(resultLink).getByText(
        strings.team.schedule.outcomes.win.accessibleLabel,
      ),
    ).toBeDefined();
  });

  it("lists the team's upcoming games with their start times, channels, and game links", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const upNext = await screen.findByRole("region", {
      name: strings.team.schedule.upNext,
    });
    const upcomingGames = within(upNext).getAllByRole("listitem");
    expect(upcomingGames).toHaveLength(4);
    expect(within(upcomingGames[0]).getByText(/LA Clippers/)).toBeDefined();
    expect(
      within(upcomingGames[0]).getByText(strings.team.schedule.next),
    ).toBeDefined();
    expect(within(upcomingGames[0]).getByText("NBA League Pass")).toBeDefined();
    expect(
      upcomingGames[0].querySelector("time")?.getAttribute("dateTime"),
    ).toBe("2026-10-24T02:00Z");
    expect(
      within(upcomingGames[0]).getByRole("link").getAttribute("href"),
    ).toBe("/game/401909851");
    expect(
      within(upNext).queryByRole("button", {
        name: strings.team.schedule.showMore,
      }),
    ).toBeNull();
  });

  it("shows the team's live game from the scoreboard at the top of Up next, linked to its game center and not announced", async () => {
    // The Lakers host the Warriors that night, while the cached schedule already lists the game as final.
    vi.useFakeTimers({
      toFake: ["Date"],
      now: new Date("2026-10-22T03:00:00Z"),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/scoreboard?dates=20261021")
          ? new Response(JSON.stringify(lakersLiveScoreboard))
          : responseFor(url),
      ),
    );
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const upNext = await screen.findByRole("region", {
      name: strings.team.schedule.upNext,
    });
    const liveGame = await within(upNext).findByText("88-64");
    vi.useRealTimers();

    const liveRow = liveGame.closest("li");
    if (!liveRow) throw new Error("Expected the live game in a list item");
    expect(within(upNext).getAllByRole("listitem")[0]).toBe(liveRow);
    expect(within(liveRow).getByText(strings.gameStatus.live)).toBeDefined();
    expect(within(liveRow).getByText("Q3 4:21 · ESPN")).toBeDefined();
    expect(within(liveRow).getByRole("link").getAttribute("href")).toBe(
      `/game/${FINAL_GAME_ID}`,
    );
    expect(
      upNext.querySelector("[aria-live], [role=status], [role=alert]"),
    ).toBeNull();
  });

  it("shows the playoff series above the regular season during the postseason", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/teams/13/schedule?seasontype=3")
          ? new Response(JSON.stringify(lakersPostseasonSchedule))
          : responseFor(url),
      ),
    );
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const playoffs = await screen.findByRole("region", {
      name: strings.team.playoffs.title,
    });
    const upNext = screen.getByRole("region", {
      name: strings.team.schedule.upNext,
    });
    expect(
      playoffs.compareDocumentPosition(upNext) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      within(playoffs)
        .getAllByRole("heading", { level: 3 })
        .map(({ textContent }) => textContent),
    ).toEqual([
      expect.stringContaining("Oklahoma City Thunder"),
      expect.stringContaining("Houston Rockets"),
    ]);
    expect(within(playoffs).getByText("OKC wins 4-0")).toBeDefined();
    expect(within(playoffs).getByText("LAL wins 4-2")).toBeDefined();
    expect(within(playoffs).getAllByRole("link")).toHaveLength(10);
  });

  it("leaves the playoffs out in the regular season", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    await screen.findByRole("region", { name: strings.team.schedule.upNext });
    expect(
      screen.queryByRole("region", { name: strings.team.playoffs.title }),
    ).toBeNull();
  });

  it("shows the team's roster", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const roster = await screen.findByRole("region", {
      name: strings.team.roster.title,
    });
    expect(within(roster).getAllByRole("row")).toHaveLength(19);
    expect(
      within(roster).getByRole("row", { name: /Luka Doncic/ }),
    ).toBeDefined();
  });

  it("shows the team's points, rebounds, and assists leaders with two runners-up each", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const leaders = await screen.findByRole("region", {
      name: strings.team.leaders.title,
    });
    const points = within(leaders).getByRole("region", {
      name: strings.home.sidebar.categories.points,
    });
    expect(within(points).getByText("Luka Doncic")).toBeDefined();
    expect(within(points).getByText("38.5")).toBeDefined();
    expect(
      within(points)
        .getAllByRole("listitem")
        .map((runnerUp) => runnerUp.textContent),
    ).toEqual(["2. A. Reaves 23.3", "· 3. W. Kessler 14.4"]);
    expect(
      within(leaders).getByRole("region", {
        name: strings.home.sidebar.categories.rebounds,
      }),
    ).toBeDefined();
    expect(
      within(leaders).getByRole("region", {
        name: strings.home.sidebar.categories.assists,
      }),
    ).toBeDefined();
  });

  it("loads the team leaders again from their error state's Try again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let isEspnDown = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        isEspnDown && url.endsWith("/teams/13/leaders?limit=3")
          ? new Response(null, { status: 500 })
          : responseFor(url),
      ),
    );

    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const tryAgain = await screen.findByRole(
      "button",
      { name: strings.common.retry },
      // The client retries the failed leaders once, a second later.
      { timeout: 3000 },
    );
    expect(screen.getByText(strings.team.leaders.error)).toBeDefined();

    isEspnDown = false;
    fireEvent.click(tryAgain);

    expect(
      await screen.findByRole("region", { name: strings.team.leaders.title }),
    ).toBeDefined();
    expect(screen.queryByText(strings.team.leaders.error)).toBeNull();
  });

  it("marks injured players with their status in the roster", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const roster = await screen.findByRole("region", {
      name: strings.team.roster.title,
    });
    expect(
      within(
        within(roster).getByRole("row", { name: /Cameron Carr/ }),
      ).getByText("Day-To-Day"),
    ).toBeDefined();
    expect(
      within(
        within(roster).getByRole("row", { name: /Luka Doncic/ }),
      ).queryByText("Day-To-Day"),
    ).toBeNull();
  });

  it("explains an injury with ESPN's report when its status is hovered or tapped", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const roster = await screen.findByRole("region", {
      name: strings.team.roster.title,
    });
    const cameronCarrStatus = await within(
      within(roster).getByRole("row", { name: /Cameron Carr/ }),
    ).findByRole("button", { name: "Day-To-Day" });
    const report =
      "Carr (oblique) is out for Friday's game against the Clippers.";

    fireEvent.pointerEnter(cameronCarrStatus, { pointerType: "mouse" });
    expect((await screen.findByRole("tooltip")).textContent).toBe(report);

    fireEvent.pointerLeave(cameronCarrStatus, { pointerType: "mouse" });
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.click(cameronCarrStatus);
    expect((await screen.findByRole("tooltip")).textContent).toBe(report);
  });

  it("shows each player's photo beside their name", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const roster = await screen.findByRole("region", {
      name: strings.team.roster.title,
    });
    const photo = within(roster)
      .getByRole("row", { name: /Cameron Carr/ })
      .querySelector("img");
    expect(photo?.getAttribute("src")).toBe(
      "https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/5113969.png&w=64&h=48",
    );
    expect(photo?.getAttribute("loading")).toBe("lazy");
  });

  it("follows and unfollows the team from its header", async () => {
    render(await TeamPage({ params: Promise.resolve({ slug: "lakers" }) }));

    const followButton = await screen.findByRole("button", {
      name: strings.team.follow,
    });
    expect(followButton.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(followButton);

    expect(favoritesStore().has(LAKERS_TEAM_ID)).toBe(true);
    const followingButton = screen.getByRole("button", {
      name: strings.team.following,
    });
    expect(followingButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(followingButton);

    expect(favoritesStore().has(LAKERS_TEAM_ID)).toBe(false);
  });

  it("returns not found for an unknown team slug", async () => {
    await expect(
      TeamPage({ params: Promise.resolve({ slug: "supersonics" }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("renders the playoffs page", () => {
    render(<PlayoffsPage />);

    expect(
      screen.getByRole("heading", { name: strings.playoffs.title }),
    ).toBeDefined();
  });
});
