import { render, screen, within } from "@testing-library/react";
import { strings } from "@/config/strings";
import type { TeamRosterPlayer } from "@/features/teams/utils/team-view";
import TeamRoster from "@/features/teams/components/TeamRoster";

const PLAYER_COUNT = 15;

function playerAt(index: number): TeamRosterPlayer {
  return {
    id: String(index),
    jersey: String(index),
    name: `Player ${index}`,
    position: "G",
    age: 25,
    height: `6' 4"`,
    headshotUrl: `https://a.espncdn.com/i/headshots/nba/players/full/${index}.png`,
    injuryStatus: null,
    injuryComment: null,
  };
}

function renderRoster({ isAboveTheFold = false } = {}) {
  const players = Array.from({ length: PLAYER_COUNT }, (_, index) =>
    playerAt(index + 1),
  );
  render(<TeamRoster players={players} isAboveTheFold={isAboveTheFold} />);
}

function headshotOf(name: string) {
  const row = screen.getByText(name).closest("tr");
  if (!row) throw new Error(`No roster row for ${name}`);
  return row.querySelector("img") as HTMLImageElement;
}

describe("TeamRoster", () => {
  it("names every column in full for screen readers", () => {
    renderRoster();

    const table = screen.getByRole("table");
    const columnNames = Object.values(strings.team.roster.columnNames);
    expect(
      columnNames.map(
        (columnName) =>
          within(table).queryByRole("columnheader", { name: columnName })
            ?.tagName,
      ),
    ).toEqual(columnNames.map(() => "TH"));
  });

  it("requests the headshots at twice their rendered size", () => {
    renderRoster();

    const headshot = headshotOf("Player 1");
    expect(headshot.getAttribute("width")).toBe("32");
    expect(headshot.src).toContain("&w=64&h=48");
  });

  it("loads every headshot lazily when another tab opens the page", () => {
    renderRoster();

    expect(headshotOf("Player 1").getAttribute("loading")).toBe("lazy");
  });

  it("loads the first headshots right away and the rest lazily when the roster opens the page", () => {
    renderRoster({ isAboveTheFold: true });

    expect(headshotOf("Player 1").getAttribute("loading")).toBeNull();
    expect(headshotOf(`Player ${PLAYER_COUNT}`).getAttribute("loading")).toBe(
      "lazy",
    );
  });
});
