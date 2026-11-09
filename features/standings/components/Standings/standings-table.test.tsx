import { render, screen, within } from "@testing-library/react";
import type { StandingsTableRow } from "@/features/standings/standings-view";
import { strings } from "@/lib/strings";
import { StandingsTable } from "./standings-table";

const TEAM_COUNT = 15;

function standingsRowAt(seed: number): StandingsTableRow {
  return {
    teamId: String(seed),
    seed,
    name: `Team ${seed}`,
    displayName: `City Team ${seed}`,
    location: "City",
    logoUrl: `https://a.espncdn.com/i/teamlogos/nba/500/team${seed}.png`,
    href: `/teams/${seed}`,
    record: "3-1",
    winPercent: ".750",
    gamesBehind: "-",
    homeRecord: "2-0",
    roadRecord: "1-1",
    lastTenRecord: "3-1",
    streak: "W2",
    streakKind: "win",
    pointDifferential: "+4.2",
    pointDifferentialKind: "positive",
    zone: "none",
    zoneLabel: null,
    clincher: null,
    isFavorite: false,
  };
}

function renderConference() {
  const rows = Array.from({ length: TEAM_COUNT }, (_, index) =>
    standingsRowAt(index + 1),
  );
  render(<StandingsTable label="Eastern Conference" rows={rows} />);
  return screen.getByRole("table", { name: "Eastern Conference" });
}

function logoOfRow(table: HTMLElement, seed: number) {
  const row = within(table).getByRole("row", {
    name: new RegExp(`City Team ${seed}\\b`),
  });
  return row.querySelector("img") as HTMLImageElement;
}

describe("StandingsTable", () => {
  it("names every column in full for screen readers", () => {
    const table = renderConference();

    const columnNames = Object.values(strings.standings.columnNames);
    expect(
      columnNames.map(
        (columnName) =>
          within(table).queryByRole("columnheader", { name: columnName })
            ?.tagName,
      ),
    ).toEqual(columnNames.map(() => "TH"));
  });

  it("loads the logos of the first rows right away and the rest lazily", () => {
    const table = renderConference();

    expect(logoOfRow(table, 1).getAttribute("loading")).toBeNull();
    expect(logoOfRow(table, TEAM_COUNT).getAttribute("loading")).toBe("lazy");
  });

  it("requests the logos at twice their rendered size", () => {
    const table = renderConference();

    const logo = logoOfRow(table, 1);
    expect(logo.getAttribute("width")).toBe("26");
    expect(logo.src).toContain("&w=52&h=52");
  });
});
