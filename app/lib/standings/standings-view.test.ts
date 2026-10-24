import type { Standings, StandingsRow } from "@/app/lib/domain/standings";
import standingsFixture from "@/app/lib/espn/__fixtures__/standings-regular-season.json";
import seasonEndFixture from "@/app/lib/espn/__fixtures__/standings-season-end.json";
import { mapConferenceStandings, mapSeason } from "@/app/lib/espn/mappers";
import type { RawStandingsResponse } from "@/app/lib/espn/raw-types";
import { strings } from "@/app/lib/strings";
import {
  buildStandingsView,
  type StandingsReadyScreen,
  type StandingsQueryState,
} from "./standings-view";

function standingsFrom(fixture: unknown, now: Date): Standings {
  const rawStandings = fixture as RawStandingsResponse;
  return {
    season: mapSeason(rawStandings, now),
    conferences: (rawStandings.children ?? []).map(mapConferenceStandings),
  };
}

const standings = standingsFrom(
  standingsFixture,
  new Date("2026-10-23T12:00:00Z"),
);
const seasonEndStandings = standingsFrom(
  seasonEndFixture,
  new Date("2026-04-20T12:00:00Z"),
);

const LAKERS_ID = "13";
const KNICKS_ID = "18";
const PACERS_ID = "11";

function screenFor({
  query = { status: "success", standings },
  favoriteTeamIds = [],
  conferenceParam = null,
}: {
  query?: StandingsQueryState;
  favoriteTeamIds?: string[];
  conferenceParam?: string | null;
} = {}) {
  return buildStandingsView({ query, favoriteTeamIds, conferenceParam }).screen;
}

function readyScreenFor(
  options: Parameters<typeof screenFor>[0] = {},
): StandingsReadyScreen {
  const screen = screenFor(options);
  if (screen.kind !== "ready") {
    throw new Error(`Expected a ready screen, got ${screen.kind}`);
  }
  return screen;
}

function withRowsReversed(source: Standings): Standings {
  return {
    ...source,
    conferences: source.conferences.map((conference) => ({
      ...conference,
      rows: [...conference.rows].reverse(),
    })),
  };
}

// The East with its leader, the Pacers, changed.
function withPacersRow(changes: Partial<StandingsRow>): StandingsQueryState {
  return {
    status: "success",
    standings: {
      ...standings,
      conferences: standings.conferences.map((conference) => ({
        ...conference,
        rows: conference.rows.map((row) =>
          row.team.id === PACERS_ID ? { ...row, ...changes } : row,
        ),
      })),
    },
  };
}

describe("buildStandingsView", () => {
  it("labels the season with an en dash", () => {
    expect(readyScreenFor().seasonLabel).toBe("SEASON 2026–27");
  });

  it("orders the rows by seed even when ESPN sends them unordered", () => {
    const fromFixture = readyScreenFor().rows.map((row) => row.seed);
    const fromReversed = readyScreenFor({
      query: { status: "success", standings: withRowsReversed(standings) },
    }).rows.map((row) => row.seed);

    const seeds = Array.from({ length: 15 }, (_, index) => index + 1);
    expect(fromFixture).toEqual(seeds);
    expect(fromReversed).toEqual(seeds);
  });

  it("puts seeds 1 to 6 in the playoff zone, 7 to 10 in the play-in, and the rest in none", () => {
    const zones = readyScreenFor().rows.map((row) => row.zone);

    expect(zones).toEqual([
      ...Array(6).fill("playoff"),
      ...Array(4).fill("play-in"),
      ...Array(5).fill("none"),
    ]);
  });

  it("describes each zone in text for screen readers", () => {
    const rows = readyScreenFor().rows;

    expect(rows[0].zoneLabel).toBe(strings.standings.zones.playoff.rowLabel);
    expect(rows[6].zoneLabel).toBe(strings.standings.zones["play-in"].rowLabel);
    expect(rows[10].zoneLabel).toBeNull();
  });

  it("lists a legend entry for each zone present", () => {
    expect(readyScreenFor().legend).toEqual([
      { zone: "playoff", label: strings.standings.zones.playoff.legend },
      { zone: "play-in", label: strings.standings.zones["play-in"].legend },
    ]);
  });

  it("leaves the play-in out of the legend when no team holds a play-in seed", () => {
    const shortStandings: Standings = {
      ...standings,
      conferences: standings.conferences.map((conference) => ({
        ...conference,
        rows: conference.rows.filter((row) => row.seed <= 6),
      })),
    };

    expect(
      readyScreenFor({
        query: { status: "success", standings: shortStandings },
      }).legend.map((entry) => entry.zone),
    ).toEqual(["playoff"]);
  });

  it("marks the teams that clinched or were eliminated late in the season", () => {
    const rows = readyScreenFor({
      query: { status: "success", standings: seasonEndStandings },
      conferenceParam: "east",
    }).rows;
    const clincherOf = (seed: number) =>
      rows.find((row) => row.seed === seed)?.clincher;

    expect(clincherOf(1)).toEqual({
      kind: "playoffs",
      ...strings.standings.clinchers.playoffs,
    });
    expect(clincherOf(9)).toEqual({
      kind: "play-in",
      ...strings.standings.clinchers["play-in"],
    });
    expect(clincherOf(15)).toEqual({
      kind: "eliminated",
      ...strings.standings.clinchers.eliminated,
    });
  });

  it("explains every marker in the legend", () => {
    expect(
      readyScreenFor({
        query: { status: "success", standings: seasonEndStandings },
      }).clincherLegend,
    ).toEqual([
      { kind: "playoffs", ...strings.standings.clinchers.playoffs },
      { kind: "play-in", ...strings.standings.clinchers["play-in"] },
      { kind: "eliminated", ...strings.standings.clinchers.eliminated },
    ]);
  });

  it("explains every marker once a single team carries one", () => {
    expect(
      readyScreenFor({
        query: withPacersRow({ clincher: "eliminated" }),
        conferenceParam: "east",
      }).clincherLegend.map((entry) => entry.kind),
    ).toEqual(["playoffs", "play-in", "eliminated"]);
  });

  it("marks no team and explains no marker before any spot is decided", () => {
    const screen = readyScreenFor();

    expect(screen.rows.every((row) => row.clincher === null)).toBe(true);
    expect(screen.clincherLegend).toEqual([]);
  });

  it("formats the mobile columns and links each row to its team page", () => {
    const [leader, , , , , , , , , , , , , , last] = readyScreenFor({
      conferenceParam: "east",
    }).rows;

    expect(leader).toMatchObject({
      teamId: PACERS_ID,
      seed: 1,
      name: "Pacers",
      displayName: "Indiana Pacers",
      location: "Indiana",
      href: "/teams/pacers",
      record: "1-0",
      winPercent: "1.000",
      streak: "W1",
      streakKind: "win",
    });
    expect(leader.logoUrl).not.toBeNull();
    expect(last).toMatchObject({
      record: "0-1",
      winPercent: ".000",
      streak: "L1",
      streakKind: "loss",
    });
  });

  it("formats the desktop columns", () => {
    const [leader, , , , , , , , , , , , , , last] = readyScreenFor({
      conferenceParam: "east",
    }).rows;

    expect(leader).toMatchObject({
      gamesBehind: "-",
      homeRecord: "0-0",
      roadRecord: "1-0",
      lastTenRecord: "1-0",
      pointDifferential: "+3.0",
      pointDifferentialKind: "positive",
    });
    expect(last).toMatchObject({
      gamesBehind: "1.0",
      pointDifferential: "-43.0",
      pointDifferentialKind: "negative",
    });
  });

  it.each([
    [2.5, "2.5"],
    [0.5, "0.5"],
    [12, "12.0"],
  ])("prints %d games behind as %s", (gamesBehind, expected) => {
    expect(
      readyScreenFor({
        query: withPacersRow({ gamesBehind }),
        conferenceParam: "east",
      }).rows[0].gamesBehind,
    ).toBe(expected);
  });

  it.each([
    [4.2, "+4.2", "positive"],
    [-1.8, "-1.8", "negative"],
    [0, "0.0", null],
    // A differential that rounds to zero is even, not "-0.0".
    [-0.04, "0.0", null],
  ])(
    "prints a point differential of %d as %s",
    (pointDifferential, expected, expectedKind) => {
      expect(
        readyScreenFor({
          query: withPacersRow({ pointDifferential }),
          conferenceParam: "east",
        }).rows[0],
      ).toMatchObject({
        pointDifferential: expected,
        pointDifferentialKind: expectedKind,
      });
    },
  );

  it("shows a dash for a team that has not played", () => {
    const cavaliers = readyScreenFor({ conferenceParam: "east" }).rows.find(
      (row) => row.name === "Cavaliers",
    );

    expect(cavaliers).toMatchObject({
      record: "0-0",
      streak: strings.standings.noStreak,
      streakKind: null,
    });
  });

  it("flags the favorite teams", () => {
    const rows = readyScreenFor({ favoriteTeamIds: [LAKERS_ID] }).rows;

    expect(
      rows.filter((row) => row.isFavorite).map((row) => row.teamId),
    ).toEqual([LAKERS_ID]);
  });

  it("opens on the West without favorites", () => {
    const screen = readyScreenFor();

    expect(screen.conferenceLabel).toBe("Western Conference");
    expect(screen.conferenceOptions).toEqual([
      {
        id: "east",
        label: "East",
        href: "/standings?conf=east",
        selected: false,
      },
      {
        id: "west",
        label: "West",
        href: "/standings?conf=west",
        selected: true,
      },
    ]);
  });

  it("opens on the first favorite team's conference", () => {
    expect(
      readyScreenFor({ favoriteTeamIds: [KNICKS_ID, LAKERS_ID] })
        .conferenceLabel,
    ).toBe("Eastern Conference");
    expect(
      readyScreenFor({ favoriteTeamIds: ["unknown", LAKERS_ID] })
        .conferenceLabel,
    ).toBe("Western Conference");
  });

  it("keeps the conference picked in the URL over the favorites", () => {
    const screen = readyScreenFor({
      favoriteTeamIds: [KNICKS_ID],
      conferenceParam: "west",
    });

    expect(screen.conferenceLabel).toBe("Western Conference");
    expect(screen.rows.map((row) => row.name)).toContain("Lakers");
  });

  it("ignores a conference in the URL it does not know", () => {
    expect(
      readyScreenFor({ favoriteTeamIds: [KNICKS_ID], conferenceParam: "north" })
        .conferenceLabel,
    ).toBe("Eastern Conference");
  });

  it("keeps showing the last standings when a refetch fails", () => {
    expect(screenFor({ query: { status: "stale", standings } }).kind).toBe(
      "ready",
    );
  });

  it.each(["loading", "error"] as const)(
    "returns the %s screen without standings",
    (status) => {
      expect(screenFor({ query: { status } })).toEqual({ kind: status });
    },
  );
});
