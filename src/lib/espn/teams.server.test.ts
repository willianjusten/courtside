// @vitest-environment node
import {
  fetchTeamDetail,
  fetchTeamSchedule,
  fetchTeams,
} from "@/lib/espn/teams";
import teamsList from "./__fixtures__/teams-list.json";
import lakersDetail from "./__fixtures__/team-detail-lakers.json";
import lakersSchedule from "./__fixtures__/team-schedule-lakers.json";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("teams on the server", () => {
  // Every Data Cache write bills as an ISR write on Vercel; the server caches mapped results in memory instead.
  it("keeps every ESPN response out of Next.js' Data Cache", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(teamsList)))
      .mockResolvedValueOnce(new Response(JSON.stringify(lakersDetail)))
      .mockResolvedValueOnce(new Response(JSON.stringify(lakersSchedule)));

    await fetchTeams();
    await fetchTeamDetail("13");
    await fetchTeamSchedule("13");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [, requestInit] of fetchMock.mock.calls) {
      expect(requestInit).toMatchObject({ cache: "no-store" });
      expect(requestInit).not.toHaveProperty("next");
    }
  });
});
