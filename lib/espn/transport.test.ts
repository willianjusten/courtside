import { fetchScoreboard } from "@/lib/espn";
import { parseNbaDate } from "@/lib/time/nba-date";
import noGames from "./__fixtures__/scoreboard-no-games.json";
import playoffGame from "./__fixtures__/scoreboard-playoff-game.json";
import { espnGet } from "./transport";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ESPN transport", () => {
  it("calls ESPN directly", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(noGames)));

    await fetchScoreboard(parseNbaDate("2026-08-01")!);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20260801",
      expect.anything(),
    );
  });

  it("skips every cache for ESPN responses", async () => {
    fetchMock.mockImplementation(
      async () => new Response(JSON.stringify(noGames)),
    );

    await espnGet("scoreboard");
    await espnGet("summary");

    for (const [, requestInit] of fetchMock.mock.calls) {
      expect(requestInit).toMatchObject({ cache: "no-store" });
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rewrites private core API hosts to the public host", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(playoffGame)));

    const rawText = JSON.stringify(await espnGet("scoreboard"));

    expect(rawText).not.toContain("sports.core.api.espn.pvt");
    expect(rawText).toContain(
      "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/2026/teams/18",
    );
  });
});
