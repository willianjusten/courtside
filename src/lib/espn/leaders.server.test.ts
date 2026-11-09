// @vitest-environment node
import { LEADER_STATS, type LeaderCategory } from "@/types/leaders";
import { fetchLeaders } from "@/lib/espn/leaders";
import currentSeason from "./__fixtures__/season-current.json";
import regularSeasonLeaders from "./__fixtures__/leaders-regular-season.json";
import leaderAthletes from "./__fixtures__/leaders-athletes.json";
import teamsList from "./__fixtures__/teams-list.json";

const CORE_NBA_URL =
  "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba";
const SEASON_URL = `${CORE_NBA_URL}/season`;
const LEADERS_URL = `${CORE_NBA_URL}/seasons/2027/types/2/leaders?limit=5`;
const TEAMS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams";
const ATHLETE_URL_PATTERN = /\/seasons\/2027\/athletes\/(\d+)$/;

type AthleteId = keyof typeof leaderAthletes;

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function respondWithEspn({
  leaders = regularSeasonLeaders as unknown,
  athletes = leaderAthletes as Record<string, unknown>,
  leadersStatus = 200,
  teams = teamsList as unknown,
} = {}) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url === SEASON_URL) return jsonResponse(currentSeason);
    if (url === TEAMS_URL) return jsonResponse(teams);
    if (url === LEADERS_URL) return jsonResponse(leaders, leadersStatus);

    const athleteId = url.match(ATHLETE_URL_PATTERN)?.[1];
    const athlete = athleteId ? athletes[athleteId] : undefined;
    return athlete ? jsonResponse(athlete) : jsonResponse({}, 404);
  });
}

function failedStats(categories: LeaderCategory[]) {
  return categories
    .filter(({ leaders }) => leaders === null)
    .map(({ stat }) => stat);
}

function athleteRequests() {
  return fetchMock.mock.calls
    .map(([url]) => url as string)
    .filter((url) => ATHLETE_URL_PATTERN.test(url));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchLeaders", () => {
  it("requests the top 5 regular season leaders of the season derived from ESPN, skipping the Data Cache", async () => {
    respondWithEspn();

    await fetchLeaders();

    const uncached = expect.objectContaining({ cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith(SEASON_URL, uncached);
    expect(fetchMock).toHaveBeenCalledWith(LEADERS_URL, uncached);
    expect(fetchMock).toHaveBeenCalledWith(
      `${CORE_NBA_URL}/seasons/2027/athletes/4065733`,
      uncached,
    );
  });

  it("returns the eight leader categories in a fixed order, whatever order ESPN sends them in", async () => {
    respondWithEspn();

    const categories = await fetchLeaders();

    expect(categories.map(({ stat }) => stat)).toEqual(LEADER_STATS);
    expect(categories.every(({ leaders }) => leaders?.length === 5)).toBe(true);
  });

  it("maps each leader with the resolved athlete's names and photo and the leader's team", async () => {
    respondWithEspn();

    const [points, rebounds] = await fetchLeaders();

    expect(points.leaders?.[0]).toEqual({
      athlete: {
        id: "4065733",
        displayName: "Ty Jerome",
        shortName: "T. Jerome",
        headshotUrl:
          "https://a.espncdn.com/i/headshots/nba/players/full/4065733.png",
      },
      team: expect.objectContaining({ id: "29", abbreviation: "MEM" }),
      value: 36.5,
      displayValue: "36.5",
    });
    expect(
      rebounds.leaders?.map((leader) => [
        leader.athlete.displayName,
        leader.team?.abbreviation,
        leader.displayValue,
      ]),
    ).toEqual([
      ["Domantas Sabonis", "SAC", "18.5"],
      ["Ivica Zubac", "IND", "13.0"],
      ["Victor Wembanyama", "SA", "13.0"],
      ["Rudy Gobert", "MIN", "12.0"],
      ["Chet Holmgren", "OKC", "12.0"],
    ]);
  });

  it("keeps percentages on ESPN's 0 to 100 scale", async () => {
    respondWithEspn();

    const categories = await fetchLeaders();
    const freeThrows = categories.find(
      ({ stat }) => stat === "freeThrowPercentage",
    );

    expect(freeThrows?.leaders?.[0].value).toBe(100);
  });

  it("maps a leader whose team is not in the teams list to no team", async () => {
    const withoutGrizzlies = structuredClone(teamsList);
    const [league] = withoutGrizzlies.sports[0].leagues;
    league.teams = league.teams.filter(({ team }) => team.id !== "29");
    respondWithEspn({ teams: withoutGrizzlies });

    const [points] = await fetchLeaders();

    expect(points.leaders?.[0].athlete.displayName).toBe("Ty Jerome");
    expect(points.leaders?.[0].team).toBeNull();
  });

  it("keeps the leaders without teams when the teams list cannot be loaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    respondWithEspn({ teams: { error: "unavailable" } });

    const [points] = await fetchLeaders();

    expect(points.leaders?.[0].athlete.displayName).toBe("Ty Jerome");
    expect(points.leaders?.[0].team).toBeNull();
  });

  it("resolves only the top 5 athletes of each category", async () => {
    const withMoreLeaders = structuredClone(regularSeasonLeaders);
    const [points, assists] = withMoreLeaders.categories;
    points.leaders.push(...assists.leaders);
    respondWithEspn({ leaders: withMoreLeaders });

    const [pointsLeaders] = await fetchLeaders();

    const topFiveAthleteIds = new Set(
      regularSeasonLeaders.categories.flatMap((category) =>
        category.leaders
          .slice(0, 5)
          .map((leader) => leader.athlete.$ref.match(/athletes\/(\d+)/)?.[1]),
      ),
    );
    expect(pointsLeaders.leaders).toHaveLength(5);
    expect(athleteRequests()).toHaveLength(topFiveAthleteIds.size);
  });

  it("resolves an athlete who leads several categories only once", async () => {
    const withRepeatedLeader = structuredClone(regularSeasonLeaders);
    const [points, assists] = withRepeatedLeader.categories;
    assists.leaders[0] = {
      ...assists.leaders[0],
      athlete: points.leaders[0].athlete,
    };
    respondWithEspn({ leaders: withRepeatedLeader });

    const [, , assistsLeaders] = await fetchLeaders();

    expect(assistsLeaders.leaders?.[0].athlete.displayName).toBe("Ty Jerome");
    expect(
      athleteRequests().filter((url) => url.endsWith("/athletes/4065733")),
    ).toHaveLength(1);
  });

  it("resolves athlete refs on ESPN's internal .pvt host through the public host", async () => {
    const withPrivateRefs = JSON.parse(
      JSON.stringify(regularSeasonLeaders).replaceAll(
        "http://sports.core.api.espn.com",
        "http://sports.core.api.espn.pvt",
      ),
    );
    respondWithEspn({ leaders: withPrivateRefs });

    const [points] = await fetchLeaders();

    expect(points.leaders?.[0].athlete.displayName).toBe("Ty Jerome");
    expect(athleteRequests()).toContain(
      `${CORE_NBA_URL}/seasons/2027/athletes/4065733`,
    );
  });

  it("maps an athlete without a headshot to a null photo", async () => {
    const tyJeromeId: AthleteId = "4065733";
    const { headshot: _headshot, ...withoutHeadshot } =
      leaderAthletes[tyJeromeId];
    respondWithEspn({
      athletes: { ...leaderAthletes, [tyJeromeId]: withoutHeadshot },
    });

    const [points] = await fetchLeaders();

    expect(points.leaders?.[0].athlete.headshotUrl).toBeNull();
  });

  it("returns empty categories when ESPN has no stats for the season yet", async () => {
    respondWithEspn({
      leaders: { error: { message: "No stats found.", code: 404 } },
      leadersStatus: 404,
    });

    const categories = await fetchLeaders();

    expect(categories.map(({ stat }) => stat)).toEqual(LEADER_STATS);
    expect(categories.every(({ leaders }) => leaders?.length === 0)).toBe(true);
    expect(athleteRequests()).toHaveLength(0);
  });

  it("throws instead of showing no leaders when the leaders endpoint is not found for another reason", async () => {
    respondWithEspn({
      leaders: { error: { message: "Not found", code: 404 } },
      leadersStatus: 404,
    });

    await expect(fetchLeaders()).rejects.toThrow(/404/);
  });

  it("throws instead of showing no leaders when a category is missing", async () => {
    const withoutRebounds = structuredClone(regularSeasonLeaders);
    withoutRebounds.categories = withoutRebounds.categories.filter(
      (category) => category.name !== "reboundsPerGame",
    );
    respondWithEspn({ leaders: withoutRebounds });

    await expect(fetchLeaders()).rejects.toThrow(/reboundsPerGame/);
  });

  it("marks only the category of an unresolved athlete as failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { "4065733": _tyJerome, ...athletesWithoutTyJerome } = leaderAthletes;
    respondWithEspn({ athletes: athletesWithoutTyJerome });

    const categories = await fetchLeaders();

    expect(failedStats(categories)).toEqual(["points"]);
  });

  it("fails every category an unresolved athlete leads", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const withRepeatedLeader = structuredClone(regularSeasonLeaders);
    const [points, assists] = withRepeatedLeader.categories;
    assists.leaders[0] = {
      ...assists.leaders[0],
      athlete: points.leaders[0].athlete,
    };
    const { "4065733": _tyJerome, ...athletesWithoutTyJerome } = leaderAthletes;
    respondWithEspn({
      leaders: withRepeatedLeader,
      athletes: athletesWithoutTyJerome,
    });

    const categories = await fetchLeaders();

    expect(failedStats(categories)).toEqual(["points", "assists"]);
  });

  it("fails the category of a leader that refers to a resource outside ESPN's NBA API", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const withForeignRef = structuredClone(regularSeasonLeaders);
    withForeignRef.categories[0].leaders[0].athlete.$ref =
      "https://example.com/v2/sports/basketball/leagues/nba/seasons/2027/athletes/1";
    respondWithEspn({ leaders: withForeignRef });

    const [points] = await fetchLeaders();

    expect(points.leaders).toBeNull();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("example.com"),
      expect.anything(),
    );
  });
});
