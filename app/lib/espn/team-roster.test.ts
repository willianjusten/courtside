import { fetchTeamRoster } from "@/app/lib/espn";
import lakersRoster from "./__fixtures__/team-roster-lakers.json";
import lakersInjuries from "./__fixtures__/team-injuries-lakers.json";
import lakersInjuryItems from "./__fixtures__/team-injuries-lakers-items.json";

const ROSTER_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/13/roster";
const INJURIES_URL =
  "/api/espn/core/v2/sports/basketball/leagues/nba/teams/13/injuries";
const INJURY_ID_IN_URL_PATTERN = /\/injuries\/(-?\d+)$/;

const fetchMock = vi.fn();

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

function respondWithEspn({
  roster = lakersRoster as unknown,
  injuries = lakersInjuries as unknown,
  injuryItems = lakersInjuryItems as Record<string, unknown>,
} = {}) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url === ROSTER_URL) return jsonResponse(roster);
    if (url === INJURIES_URL) return jsonResponse(injuries);

    const injuryId = url.match(INJURY_ID_IN_URL_PATTERN)?.[1];
    const injuryItem = injuryId ? injuryItems[injuryId] : undefined;
    return injuryItem
      ? jsonResponse(injuryItem)
      : new Response("Not found", { status: 404 });
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchTeamRoster", () => {
  it("requests the team roster directly from ESPN", async () => {
    respondWithEspn();

    await fetchTeamRoster("13");

    expect(fetchMock).toHaveBeenCalledWith(ROSTER_URL, expect.anything());
  });

  it("maps every player on the roster", async () => {
    respondWithEspn();

    const players = await fetchTeamRoster("13");

    expect(players).toHaveLength(18);
    expect(players[1]).toEqual({
      id: "3945274",
      displayName: "Luka Doncic",
      jersey: "77",
      position: "G",
      height: `6' 8"`,
      weight: "230 lbs",
      age: 27,
      headshotUrl:
        "https://a.espncdn.com/i/headshots/nba/players/full/3945274.png",
      injuryStatus: null,
      injuryComment: null,
    });
  });

  it("maps the injury status ESPN sends for an injured player", async () => {
    respondWithEspn();

    const [cameronCarr] = await fetchTeamRoster("13");

    expect(cameronCarr).toMatchObject({
      displayName: "Cameron Carr",
      injuryStatus: "Day-To-Day",
    });
  });

  it("explains each injury with ESPN's report on it", async () => {
    respondWithEspn();

    const players = await fetchTeamRoster("13");

    expect(
      players
        .filter(({ injuryComment }) => injuryComment)
        .map(({ displayName, injuryComment }) => [displayName, injuryComment]),
    ).toEqual([
      [
        "Cameron Carr",
        "Carr (oblique) is out for Friday's game against the Clippers.",
      ],
      [
        "Jake LaRavia",
        "LaRavia (ankle) has been ruled out for Friday's game against the Clippers, Mark Medina of TheSportingTribune.com reports.",
      ],
      [
        "Adou Thiero",
        "Thiero (knee) is out for Friday's game against the Clippers.",
      ],
    ]);
  });

  it("follows the injury reports through the ESPN proxy", async () => {
    respondWithEspn();

    await fetchTeamRoster("13");

    expect(fetchMock).toHaveBeenCalledWith(INJURIES_URL, expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/espn/core/v2/sports/basketball/leagues/nba/seasons/2027/athletes/5113969/injuries/-59637",
      expect.anything(),
    );
  });

  it("leaves the explanation out for an injury ESPN has no report on", async () => {
    respondWithEspn();

    const players = await fetchTeamRoster("13");

    expect(
      players.find(({ displayName }) => displayName === "Collin Sexton"),
    ).toMatchObject({ injuryStatus: "Day-To-Day", injuryComment: null });
  });

  it("keeps the roster and its injury statuses when the injury reports fail to load", async () => {
    respondWithEspn({ injuries: { error: "unavailable" } });

    const players = await fetchTeamRoster("13");

    expect(players).toHaveLength(18);
    expect(players[0]).toMatchObject({
      displayName: "Cameron Carr",
      injuryStatus: "Day-To-Day",
      injuryComment: null,
    });
  });

  it("keeps the other explanations when one injury report fails to load", async () => {
    const { "-59637": _cameronCarrReport, ...otherReports } = lakersInjuryItems;
    respondWithEspn({ injuryItems: otherReports });

    const players = await fetchTeamRoster("13");

    expect(players.filter(({ injuryComment }) => injuryComment)).toHaveLength(
      2,
    );
  });

  it("maps missing player details to null", async () => {
    respondWithEspn({
      roster: { athletes: [{ id: "1", displayName: "Unknown Player" }] },
    });

    expect(await fetchTeamRoster("13")).toEqual([
      {
        id: "1",
        displayName: "Unknown Player",
        jersey: null,
        position: null,
        height: null,
        weight: null,
        age: null,
        headshotUrl: null,
        injuryStatus: null,
        injuryComment: null,
      },
    ]);
  });

  it("throws instead of reporting an empty roster when the response has no athletes list", async () => {
    respondWithEspn({ roster: { team: {} } });

    await expect(fetchTeamRoster("13")).rejects.toThrow();
  });
});
