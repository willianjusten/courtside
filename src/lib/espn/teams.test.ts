import { fetchTeamDetail, fetchTeams } from "@/lib/espn/teams";
import teamsList from "./__fixtures__/teams-list.json";
import lakersDetail from "./__fixtures__/team-detail-lakers.json";

const fetchMock = vi.fn();

function respondWith(body: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status: 200 }),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchTeams", () => {
  it("requests the teams list from ESPN", async () => {
    respondWith(teamsList);

    await fetchTeams();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams",
      expect.anything(),
    );
  });

  it("maps all 30 teams with a slug from the short name", async () => {
    respondWith(teamsList);

    const teams = await fetchTeams();

    expect(teams.map((team) => team.slug).sort()).toEqual(
      [
        "hawks",
        "celtics",
        "nets",
        "hornets",
        "bulls",
        "cavaliers",
        "mavericks",
        "nuggets",
        "pistons",
        "warriors",
        "rockets",
        "pacers",
        "clippers",
        "lakers",
        "grizzlies",
        "heat",
        "bucks",
        "timberwolves",
        "pelicans",
        "knicks",
        "thunder",
        "magic",
        "76ers",
        "suns",
        "trail-blazers",
        "kings",
        "spurs",
        "raptors",
        "jazz",
        "wizards",
      ].sort(),
    );
    expect(teams.find((team) => team.id === "13")).toEqual({
      id: "13",
      slug: "lakers",
      abbreviation: "LAL",
      name: "Lakers",
      displayName: "Los Angeles Lakers",
      location: "Los Angeles",
      color: "552583",
      alternateColor: "fdb927",
      logoUrl: "https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/lal.png",
    });
  });

  it("throws instead of reporting no teams when the response has no teams list", async () => {
    respondWith({ sports: [] });

    await expect(fetchTeams()).rejects.toThrow();
  });
});

describe("fetchTeamDetail", () => {
  it("requests the team by its ESPN id from ESPN", async () => {
    respondWith(lakersDetail);

    await fetchTeamDetail("13");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/13",
      expect.anything(),
    );
  });

  it("maps the team with its record and standing", async () => {
    respondWith(lakersDetail);

    expect(await fetchTeamDetail("13")).toEqual({
      id: "13",
      slug: "lakers",
      abbreviation: "LAL",
      name: "Lakers",
      displayName: "Los Angeles Lakers",
      location: "Los Angeles",
      color: "552583",
      alternateColor: "fdb927",
      logoUrl: "https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/lal.png",
      record: "1-0",
      standingSummary: "1st in Pacific Division",
    });
  });
});
