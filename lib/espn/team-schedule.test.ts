import {
  fetchScoreboard,
  fetchTeamPlayoffSchedule,
  fetchTeamSchedule,
} from "@/lib/espn";
import { parseNbaDate } from "@/lib/time/nba-date";
import lakersSchedule from "./__fixtures__/team-schedule-lakers.json";
import lakersPostseasonSchedule from "./__fixtures__/team-schedule-lakers-postseason.json";
import lakersFinalScoreboard from "./__fixtures__/scoreboard-lakers-final.json";

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

describe("fetchTeamSchedule", () => {
  it("requests the regular season schedule directly from ESPN", async () => {
    respondWith(lakersSchedule);

    await fetchTeamSchedule("13");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/13/schedule?seasontype=2",
      expect.anything(),
    );
  });

  it("maps past and upcoming games in date order", async () => {
    respondWith(lakersSchedule);

    const games = await fetchTeamSchedule("13");

    expect(
      games.map((game) => [game.id, game.nbaDate, game.status.kind]),
    ).toEqual([
      ["401909092", "2026-10-21", "final"],
      ["401909851", "2026-10-23", "scheduled"],
      ["401909861", "2026-10-25", "scheduled"],
      ["401909880", "2026-10-27", "scheduled"],
      ["401909892", "2026-10-28", "scheduled"],
    ]);
  });

  it("maps a final game with scores normalized from objects to numbers", async () => {
    respondWith(lakersSchedule);

    const [finalGame] = await fetchTeamSchedule("13");

    expect(finalGame).toEqual({
      id: "401909092",
      startTime: "2026-10-22T02:00Z",
      nbaDate: "2026-10-21",
      seasonYear: 2027,
      seasonType: "regular",
      status: { kind: "final", period: 4 },
      venue: "crypto.com Arena",
      home: {
        team: {
          id: "13",
          abbreviation: "LAL",
          name: "Lakers",
          displayName: "Los Angeles Lakers",
          location: "Los Angeles",
          color: null,
          alternateColor: null,
          logoUrl:
            "https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/lal.png",
        },
        score: 127,
        winner: true,
        record: "1-0",
      },
      away: {
        team: {
          id: "9",
          abbreviation: "GS",
          name: "Warriors",
          displayName: "Golden State Warriors",
          location: "Golden State",
          color: null,
          alternateColor: null,
          logoUrl:
            "https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/gs.png",
        },
        score: 105,
        winner: false,
        record: "0-1",
      },
      broadcasts: [{ name: "ESPN", market: "national" }],
      series: null,
      homeWinProbability: null,
      topScorer: null,
    });
  });

  it("reports the same final score as the scoreboard for the same game", async () => {
    respondWith(lakersSchedule);
    respondWith(lakersFinalScoreboard);

    const [scheduleGame] = await fetchTeamSchedule("13");
    const {
      games: [scoreboardGame],
    } = await fetchScoreboard(parseNbaDate("2026-10-21")!);

    expect(scheduleGame.id).toBe(scoreboardGame.id);
    expect([scheduleGame.home.score, scheduleGame.away.score]).toEqual([
      scoreboardGame.home.score,
      scoreboardGame.away.score,
    ]);
    expect([scheduleGame.home.winner, scheduleGame.away.winner]).toEqual([
      scoreboardGame.home.winner,
      scoreboardGame.away.winner,
    ]);
  });

  it("maps an upcoming game without scores to zero scores and no winner", async () => {
    respondWith(lakersSchedule);

    const [, upcomingGame] = await fetchTeamSchedule("13");

    expect(upcomingGame.status).toEqual({ kind: "scheduled" });
    expect(upcomingGame.startTime).toBe("2026-10-24T02:00Z");
    expect(upcomingGame.home).toMatchObject({ score: 0, winner: false });
    expect(upcomingGame.away).toMatchObject({ score: 0, winner: false });
    expect(upcomingGame.away.team.displayName).toBe("LA Clippers");
  });

  it("keeps only supported channels from the schedule broadcasts", async () => {
    respondWith(lakersSchedule);

    const [, upcomingGame] = await fetchTeamSchedule("13");

    expect(upcomingGame.broadcasts).toEqual([
      { name: "NBA League Pass", market: "away" },
    ]);
  });

  it("throws instead of reporting no games when the response has no events list", async () => {
    respondWith({ team: {} });

    await expect(fetchTeamSchedule("13")).rejects.toThrow();
  });
});

describe("fetchTeamPlayoffSchedule", () => {
  it("requests the postseason schedule directly from ESPN", async () => {
    respondWith(lakersPostseasonSchedule);

    await fetchTeamPlayoffSchedule("13");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/13/schedule?seasontype=3",
      expect.anything(),
    );
  });

  it("maps each playoff game with its round and game number", async () => {
    respondWith(lakersPostseasonSchedule);

    const games = await fetchTeamPlayoffSchedule("13");

    expect(
      games.map((game) => [
        game.id,
        game.seasonType,
        game.roundName,
        game.gameNumber,
      ]),
    ).toEqual([
      ["401869190", "postseason", "West 1st Round", 1],
      ["401869397", "postseason", "West 1st Round", 2],
      ["401869400", "postseason", "West 1st Round", 3],
      ["401869405", "postseason", "West 1st Round", 4],
      ["401869407", "postseason", "West 1st Round", 5],
      ["401869409", "postseason", "West 1st Round", 6],
      ["401871326", "postseason", "West Semifinals", 1],
      ["401871327", "postseason", "West Semifinals", 2],
      ["401871328", "postseason", "West Semifinals", 3],
      ["401871329", "postseason", "West Semifinals", 4],
    ]);
  });

  it("leaves the round and game number out when ESPN sends no note", async () => {
    const [event] = lakersPostseasonSchedule.events;
    respondWith({
      ...lakersPostseasonSchedule,
      events: [
        {
          ...event,
          competitions: [{ ...event.competitions[0], notes: [] }],
        },
      ],
    });

    const [game] = await fetchTeamPlayoffSchedule("13");

    expect(game).toMatchObject({ roundName: null, gameNumber: null });
  });

  it("reports no playoff games outside the postseason", async () => {
    // ESPN keeps serving the last postseason once it ends, under the current season type.
    respondWith({
      ...lakersPostseasonSchedule,
      season: { year: 2026, type: 4, name: "Off Season" },
    });

    await expect(fetchTeamPlayoffSchedule("13")).resolves.toEqual([]);
  });

  it("throws instead of reporting no games when the response has no events list", async () => {
    respondWith({ season: { year: 2026, type: 3 } });

    await expect(fetchTeamPlayoffSchedule("13")).rejects.toThrow();
  });
});
