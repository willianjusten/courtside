// @vitest-environment node
import { GAME_LEADER_STATS } from "@/app/lib/domain/leaders";
import { fetchTeamLeaders } from "@/app/lib/espn/leaders";
import currentSeason from "./__fixtures__/season-current.json";
import lakersLeaders from "./__fixtures__/team-leaders-lakers.json";
import lakersLeaderAthletes from "./__fixtures__/team-leaders-lakers-athletes.json";

const LAKERS_TEAM_ID = "13";
const CORE_NBA_URL =
  "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba";
const SEASON_URL = `${CORE_NBA_URL}/season`;
const TEAM_LEADERS_URL = `${CORE_NBA_URL}/seasons/2027/types/2/teams/${LAKERS_TEAM_ID}/leaders?limit=3`;
const ATHLETE_URL_PATTERN = /\/seasons\/2027\/athletes\/(\d+)$/;

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function respondWithEspn({
  leaders = lakersLeaders as unknown,
  leadersStatus = 200,
  athletes = lakersLeaderAthletes as Record<string, unknown>,
} = {}) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url === SEASON_URL) return jsonResponse(currentSeason);
    if (url === TEAM_LEADERS_URL) return jsonResponse(leaders, leadersStatus);

    const athleteId = url.match(ATHLETE_URL_PATTERN)?.[1];
    const athlete = athleteId ? athletes[athleteId] : undefined;
    return athlete ? jsonResponse(athlete) : jsonResponse({}, 404);
  });
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

describe("fetchTeamLeaders", () => {
  it("requests the team's top 3 regular season leaders of the current season, skipping the Data Cache", async () => {
    respondWithEspn();

    await fetchTeamLeaders(LAKERS_TEAM_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      TEAM_LEADERS_URL,
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("returns points, rebounds, and assists in a fixed order, whatever order ESPN sends them in", async () => {
    respondWithEspn();

    const categories = await fetchTeamLeaders(LAKERS_TEAM_ID);

    expect(categories.map(({ stat }) => stat)).toEqual(GAME_LEADER_STATS);
  });

  it("maps each leader with the resolved athlete's names, photo, and value", async () => {
    respondWithEspn();

    const [points] = await fetchTeamLeaders(LAKERS_TEAM_ID);

    expect(points.leaders?.map(({ displayValue }) => displayValue)).toEqual([
      "38.5",
      "23.3",
      "14.4",
    ]);
    expect(points.leaders?.[0]).toMatchObject({
      athlete: {
        id: "3945274",
        displayName: "Luka Doncic",
        shortName: "L. Doncic",
        headshotUrl: expect.stringContaining("3945274"),
      },
      value: 38.5,
    });
  });

  it("resolves an athlete who leads several categories only once", async () => {
    respondWithEspn();

    await fetchTeamLeaders(LAKERS_TEAM_ID);

    const requests = athleteRequests();
    expect(requests).toHaveLength(new Set(requests).size);
    expect(requests).toHaveLength(Object.keys(lakersLeaderAthletes).length);
  });

  it("returns empty categories when the team has no stats for the season yet", async () => {
    respondWithEspn({
      leaders: { error: { message: "No stats found.", code: 404 } },
      leadersStatus: 404,
    });

    const categories = await fetchTeamLeaders(LAKERS_TEAM_ID);

    expect(categories).toEqual(
      GAME_LEADER_STATS.map((stat) => ({ stat, leaders: [] })),
    );
    expect(athleteRequests()).toHaveLength(0);
  });

  it("marks only the categories of an unresolved athlete as failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { "4433136": _walkerKessler, ...athletesWithoutKessler } =
      lakersLeaderAthletes;
    respondWithEspn({ athletes: athletesWithoutKessler });

    const categories = await fetchTeamLeaders(LAKERS_TEAM_ID);

    // Kessler is third in points and leads rebounds, but is not among the assists leaders.
    expect(
      categories
        .filter(({ leaders }) => leaders === null)
        .map(({ stat }) => stat),
    ).toEqual(["points", "rebounds"]);
  });
});
