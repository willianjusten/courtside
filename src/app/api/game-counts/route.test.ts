// @vitest-environment node
import headerWeek from "@/lib/espn/__fixtures__/scoreboard-header-week.json";
import { GET } from "./route";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const requestCounts = (search: string) =>
  GET(new Request(`http://localhost/api/game-counts?${search}`));

describe("game counts route", () => {
  it("answers each day's game count, not ESPN's games", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(headerWeek));

    const response = await requestCounts("from=2026-10-20&to=2026-10-22");

    expect(Object.keys(await response.json())).toEqual([
      "2026-10-20",
      "2026-10-21",
      "2026-10-22",
    ]);
  });

  it.each([
    ["a missing date", "from=2026-10-20"],
    ["an invalid date", "from=2026-10-20&to=2026-02-30"],
    ["a reversed range", "from=2026-10-22&to=2026-10-20"],
    ["a range longer than a month", "from=2026-10-01&to=2026-12-01"],
  ])("rejects %s without calling ESPN", async (_case, search) => {
    const response = await requestCounts(search);

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
