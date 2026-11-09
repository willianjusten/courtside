import { render, screen } from "@testing-library/react";
import type { LeaderRow } from "@/features/standings/utils/standings-view";
import LeagueLeaders from "@/features/standings/components/LeagueLeaders";

function leaderAt(rank: number): LeaderRow {
  return {
    athleteId: String(rank),
    rank,
    name: `Player ${rank}`,
    headshotUrl: `https://a.espncdn.com/i/headshots/nba/players/full/${rank}.png`,
    teamAbbreviation: "IND",
    teamLogoUrl: "https://a.espncdn.com/i/teamlogos/nba/500/ind.png",
    value: "31.4",
    isFavorite: false,
  };
}

function headshotOf(name: string) {
  const leaderItem = screen.getByText(name).closest("li");
  if (!leaderItem) throw new Error(`No leader item for ${name}`);
  return leaderItem.querySelector<HTMLImageElement>(`img[src*="headshots"]`)!;
}

function renderLeaders({ isAboveTheFold = false } = {}) {
  render(
    <LeagueLeaders
      leaders={{
        kind: "ready",
        categories: [
          {
            stat: "points",
            title: "POINTS",
            status: "ready",
            leaders: [leaderAt(1), leaderAt(2)],
          },
        ],
        percentagesNote: null,
        staleNotice: null,
      }}
      onRetry={() => {}}
      isRetrying={false}
      isAboveTheFold={isAboveTheFold}
    />,
  );
}

describe("LeagueLeaders", () => {
  it("requests the leader's headshot at twice its rendered size", () => {
    renderLeaders();

    const headshot = headshotOf("Player 1");
    expect(headshot.getAttribute("width")).toBe("56");
    expect(headshot.getAttribute("height")).toBe("41");
    expect(headshot.src).toContain("&w=112&h=82");
  });

  it("requests the runner-up headshots at their smaller rendered size", () => {
    renderLeaders();

    const headshot = headshotOf("Player 2");
    expect(headshot.getAttribute("width")).toBe("32");
    expect(headshot.getAttribute("height")).toBe("24");
    expect(headshot.src).toContain("&w=64&h=48");
  });

  it("loads the headshots lazily below the standings", () => {
    renderLeaders();

    expect(headshotOf("Player 1").getAttribute("loading")).toBe("lazy");
    expect(headshotOf("Player 2").getAttribute("loading")).toBe("lazy");
  });

  it("loads the headshots right away when the leaders open the page", () => {
    renderLeaders({ isAboveTheFold: true });

    expect(headshotOf("Player 1").getAttribute("loading")).toBeNull();
    expect(headshotOf("Player 2").getAttribute("loading")).toBeNull();
  });
});
