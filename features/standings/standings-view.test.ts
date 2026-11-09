import type { LeaderCategory, LeaderStat } from "@/lib/domain/leaders";
import type { Standings, StandingsRow } from "@/lib/domain/standings";
import leaderAthletes from "@/lib/espn/__fixtures__/leaders-athletes.json";
import leadersFixture from "@/lib/espn/__fixtures__/leaders-regular-season.json";
import teamsListFixture from "@/lib/espn/__fixtures__/teams-list.json";
import standingsFixture from "@/lib/espn/__fixtures__/standings-regular-season.json";
import seasonEndFixture from "@/lib/espn/__fixtures__/standings-season-end.json";
import {
  mapConferenceStandings,
  mapLeader,
  mapListedTeam,
  mapSeason,
} from "@/lib/espn/mappers";
import type {
  RawLeaderAthlete,
  RawListedTeam,
  RawStandingsResponse,
} from "@/lib/espn/raw-types";
import { strings } from "@/lib/strings";
import {
  buildStandingsView,
  type LeadersQueryState,
  type StandingsLeaders,
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

const CATEGORY_NAME_BY_STAT: Record<LeaderStat, string> = {
  points: "pointsPerGame",
  rebounds: "reboundsPerGame",
  assists: "assistsPerGame",
  steals: "stealsPerGame",
  blocks: "blocksPerGame",
  threesMade: "3PointsMadePerGame",
  fieldGoalPercentage: "fieldGoalPercentage",
  freeThrowPercentage: "FreeThrowPct",
};

const teamsById = new Map(
  (
    teamsListFixture.sports[0].leagues[0].teams as unknown as {
      team: RawListedTeam;
    }[]
  ).map(({ team }) => [team.id, mapListedTeam(team)]),
);

// The leaders in ESPN's category order, mapped as the server assembly maps them.
const leaderCategories: LeaderCategory[] = leadersFixture.categories.map(
  (rawCategory) => ({
    stat: (Object.keys(CATEGORY_NAME_BY_STAT) as LeaderStat[]).find(
      (stat) => CATEGORY_NAME_BY_STAT[stat] === rawCategory.name,
    )!,
    leaders: rawCategory.leaders.map((rawLeader) => {
      const athleteId = rawLeader.athlete.$ref.match(/athletes\/(\d+)/)![1];
      const teamId = rawLeader.team.$ref.match(/teams\/(\d+)/)![1];
      return {
        ...mapLeader(
          rawLeader,
          leaderAthletes[
            athleteId as keyof typeof leaderAthletes
          ] as RawLeaderAthlete,
        ),
        team: teamsById.get(teamId) ?? null,
      };
    }),
  }),
);

const LAKERS_ID = "13";
const KNICKS_ID = "18";
const PACERS_ID = "11";
const GRIZZLIES_ID = "29";

type ViewOptions = {
  query?: StandingsQueryState;
  leadersQuery?: LeadersQueryState;
  favoriteTeamIds?: string[];
  conferenceParam?: string | null;
  viewParam?: string | null;
};

function viewFor({
  query = { status: "success", standings },
  leadersQuery = { status: "success", categories: leaderCategories },
  favoriteTeamIds = [],
  conferenceParam = null,
  viewParam = null,
}: ViewOptions = {}) {
  return buildStandingsView({
    query,
    leadersQuery,
    favoriteTeamIds,
    conferenceParam,
    viewParam,
  });
}

function screenFor(options: ViewOptions = {}) {
  return viewFor(options).screen;
}

function readyLeadersFor(
  options: ViewOptions = {},
): Extract<StandingsLeaders, { kind: "ready" }> {
  const leaders = viewFor(options).leaders;
  if (leaders.kind !== "ready") {
    throw new Error(`Expected ready leaders, got ${leaders.kind}`);
  }
  return leaders;
}

// Every team with the given number of games played, split evenly between wins and losses.
function withGamesPlayed(source: Standings, gamesPlayed: number): Standings {
  return {
    ...source,
    conferences: source.conferences.map((conference) => ({
      ...conference,
      rows: conference.rows.map((row) => ({
        ...row,
        wins: Math.ceil(gamesPlayed / 2),
        losses: Math.floor(gamesPlayed / 2),
      })),
    })),
  };
}

function inPreseason(source: Standings): Standings {
  return {
    ...source,
    season: { ...source.season, currentPhase: "preseason" },
  };
}

const preseasonQuery = {
  status: "success",
  standings: inPreseason(withGamesPlayed(standings, 0)),
} satisfies StandingsQueryState;

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

  it("keeps showing the last standings with a stale warning when a refetch fails", () => {
    const screen = readyScreenFor({ query: { status: "stale", standings } });

    expect(screen.rows).toHaveLength(15);
    expect(screen.staleNotice).toBe(strings.standings.stale);
  });

  it("shows no stale warning on fresh standings", () => {
    expect(readyScreenFor().staleNotice).toBeNull();
  });

  it("shows the preseason empty state before the first regular season game", () => {
    expect(screenFor({ query: preseasonQuery })).toEqual({
      kind: "empty",
      message: strings.standings.preseason,
    });
  });

  it("shows the table once the regular season starts, even before a game is played", () => {
    expect(
      screenFor({
        query: {
          status: "success",
          standings: withGamesPlayed(standings, 0),
        },
      }).kind,
    ).toBe("ready");
  });

  it("shows the table in the preseason once a team has played a regular season game", () => {
    expect(
      screenFor({
        query: {
          status: "success",
          standings: inPreseason(withGamesPlayed(standings, 1)),
        },
      }).kind,
    ).toBe("ready");
  });

  it("keeps the preseason empty state when a refetch fails", () => {
    expect(
      screenFor({ query: { ...preseasonQuery, status: "stale" } }).kind,
    ).toBe("empty");
  });

  it.each(["loading", "error"] as const)(
    "returns the %s screen without standings",
    (status) => {
      expect(screenFor({ query: { status } })).toEqual({ kind: status });
    },
  );
});

describe("buildStandingsView leaders", () => {
  const lateSeason: StandingsQueryState = {
    status: "success",
    standings: seasonEndStandings,
  };

  it("lists the categories in a fixed order, whatever order ESPN sends them in", () => {
    const { categories } = readyLeadersFor({ query: lateSeason });

    expect(categories.map(({ stat, title }) => [stat, title])).toEqual([
      ["points", "Points per game"],
      ["rebounds", "Rebounds per game"],
      ["assists", "Assists per game"],
      ["steals", "Steals per game"],
      ["blocks", "Blocks per game"],
      ["threesMade", "3-pointers made per game"],
      ["fieldGoalPercentage", "Field goal %"],
      ["freeThrowPercentage", "Free throw %"],
    ]);
  });

  it("shows each leader's rank, headshot, name, team, and value", () => {
    const [points] = readyLeadersFor().categories;

    expect(points.status === "ready" && points.leaders[0]).toEqual({
      athleteId: "4065733",
      rank: 1,
      name: "Ty Jerome",
      headshotUrl:
        "https://a.espncdn.com/i/headshots/nba/players/full/4065733.png",
      teamAbbreviation: "MEM",
      teamLogoUrl: teamsById.get(GRIZZLIES_ID)?.logoUrl,
      value: "36.5",
      isFavorite: false,
    });
  });

  it("keeps only the top 5 of each category", () => {
    const withMoreLeaders = leaderCategories.map((category) => ({
      ...category,
      leaders: [...(category.leaders ?? []), ...(category.leaders ?? [])],
    }));

    const { categories } = readyLeadersFor({
      query: lateSeason,
      leadersQuery: { status: "success", categories: withMoreLeaders },
    });

    expect(
      categories.map((category) =>
        category.status === "ready"
          ? category.leaders.map((leader) => leader.rank)
          : [],
      ),
    ).toEqual(Array.from({ length: 8 }, () => [1, 2, 3, 4, 5]));
  });

  it("shows averages with one decimal and percentages as percentages", () => {
    const valuesOf = (stat: LeaderStat, value: number) => {
      const categories = leaderCategories.map((category) => ({
        ...category,
        leaders: (category.leaders ?? []).map((leader) => ({
          ...leader,
          value,
        })),
      }));
      const category = readyLeadersFor({
        query: lateSeason,
        leadersQuery: { status: "success", categories },
      }).categories.find((candidate) => candidate.stat === stat);
      return category?.status === "ready" ? category.leaders[0].value : null;
    };

    expect(valuesOf("points", 31.44)).toBe("31.4");
    expect(valuesOf("steals", 2)).toBe("2.0");
    expect(valuesOf("fieldGoalPercentage", 88.88899993896484)).toBe("88.9%");
    expect(valuesOf("freeThrowPercentage", 100)).toBe("100.0%");
  });

  it("flags the leaders of favorite teams", () => {
    const [points] = readyLeadersFor({
      favoriteTeamIds: [GRIZZLIES_ID],
    }).categories;

    expect(
      points.status === "ready" &&
        points.leaders.map((leader) => [leader.name, leader.isFavorite]),
    ).toEqual([
      ["Ty Jerome", true],
      ["Giannis Antetokounmpo", false],
      ["Julius Randle", false],
      ["Donovan Mitchell", false],
      ["Tyrese Maxey", false],
    ]);
  });

  it("shows no team for a leader whose team is unknown", () => {
    const categories = leaderCategories.map((category) => ({
      ...category,
      leaders: (category.leaders ?? []).map((leader) => ({
        ...leader,
        team: null,
      })),
    }));

    const [points] = readyLeadersFor({
      favoriteTeamIds: [GRIZZLIES_ID],
      leadersQuery: { status: "success", categories },
    }).categories;

    expect(points.status === "ready" && points.leaders[0]).toMatchObject({
      teamAbbreviation: null,
      teamLogoUrl: null,
      isFavorite: false,
    });
  });

  it("hides the percentage categories early in the season and explains why", () => {
    const leaders = readyLeadersFor();

    expect(leaders.categories.map(({ stat }) => stat)).not.toContain(
      "fieldGoalPercentage",
    );
    expect(leaders.categories.map(({ stat }) => stat)).not.toContain(
      "freeThrowPercentage",
    );
    expect(leaders.categories).toHaveLength(6);
    expect(leaders.percentagesNote).toBe(
      strings.standings.leaders.percentagesHidden,
    );
  });

  it("shows the percentage categories once the median team has played 10 games", () => {
    const statsFor = (gamesPlayed: number) =>
      readyLeadersFor({
        query: {
          status: "success",
          standings: withGamesPlayed(standings, gamesPlayed),
        },
      }).categories.map(({ stat }) => stat);

    expect(statsFor(9)).not.toContain("fieldGoalPercentage");
    expect(statsFor(10)).toContain("fieldGoalPercentage");
    expect(statsFor(10)).toContain("freeThrowPercentage");
    expect(readyLeadersFor({ query: lateSeason }).percentagesNote).toBeNull();
  });

  it("goes by the median team, so a few teams with more games do not show the percentages", () => {
    const mostlyEarly = withGamesPlayed(standings, 4);
    const [east, west] = mostlyEarly.conferences;
    const withEastAhead: Standings = {
      ...mostlyEarly,
      conferences: [
        {
          ...east,
          rows: east.rows.map((row, index) =>
            index < 14 ? { ...row, wins: 10, losses: 2 } : row,
          ),
        },
        west,
      ],
    };

    expect(
      readyLeadersFor({
        query: { status: "success", standings: withEastAhead },
      }).categories.map(({ stat }) => stat),
    ).not.toContain("fieldGoalPercentage");
  });

  it("hides the percentage categories while the standings are not loaded", () => {
    expect(
      readyLeadersFor({ query: { status: "loading" } }).categories,
    ).toHaveLength(6);
  });

  it("does not claim teams lack games when the standings failed to load", () => {
    const leaders = readyLeadersFor({ query: { status: "error" } });

    expect(leaders.categories).toHaveLength(6);
    expect(leaders.percentagesNote).toBeNull();
  });

  it("marks categories without leaders as empty and failed ones as errors", () => {
    const categories = leaderCategories.map((category) =>
      category.stat === "points"
        ? { ...category, leaders: [] }
        : category.stat === "rebounds"
          ? { ...category, leaders: null }
          : category,
    );

    const [points, rebounds] = readyLeadersFor({
      leadersQuery: { status: "success", categories },
    }).categories;

    expect(points).toEqual({
      stat: "points",
      title: "Points per game",
      status: "empty",
    });
    expect(rebounds).toEqual({
      stat: "rebounds",
      title: "Rebounds per game",
      status: "error",
    });
  });

  it("keeps the last leaders with a stale warning when a refetch fails", () => {
    const leaders = readyLeadersFor({
      leadersQuery: { status: "stale", categories: leaderCategories },
    });

    expect(leaders.categories).toHaveLength(6);
    expect(leaders.staleNotice).toBe(strings.standings.leaders.stale);
  });

  it("shows no stale warning on fresh leaders", () => {
    expect(readyLeadersFor().staleNotice).toBeNull();
  });

  it("shows the preseason empty state before the first regular season game", () => {
    expect(viewFor({ query: preseasonQuery }).leaders).toEqual({
      kind: "empty",
      message: strings.standings.leaders.preseason,
    });
  });

  it.each(["loading", "error"] as const)(
    "shows the preseason empty state even while the leaders are %s",
    (status) => {
      expect(
        viewFor({ query: preseasonQuery, leadersQuery: { status } }).leaders
          .kind,
      ).toBe("empty");
    },
  );

  it("keeps showing the leaders when the standings go stale", () => {
    expect(
      readyLeadersFor({ query: { status: "stale", standings } }).categories,
    ).toHaveLength(6);
  });

  it.each(["loading", "error"] as const)(
    "returns %s leaders without leaders data",
    (status) => {
      expect(viewFor({ leadersQuery: { status } }).leaders).toEqual({
        kind: status,
      });
    },
  );
});

describe("buildStandingsView view switch", () => {
  it("shows the standings by default", () => {
    const view = viewFor();

    expect(view.selectedView).toBe("standings");
    expect(view.viewOptions).toEqual([
      {
        id: "standings",
        label: "Standings",
        href: "/standings",
        selected: true,
      },
      {
        id: "leaders",
        label: "Leaders",
        href: "/standings?view=leaders",
        selected: false,
      },
    ]);
  });

  it("shows the leaders picked in the URL", () => {
    const view = viewFor({ viewParam: "leaders" });

    expect(view.selectedView).toBe("leaders");
    expect(view.viewOptions.map(({ id, selected }) => [id, selected])).toEqual([
      ["standings", false],
      ["leaders", true],
    ]);
  });

  it("ignores a view in the URL it does not know", () => {
    expect(viewFor({ viewParam: "players" }).selectedView).toBe("standings");
  });

  it("keeps the conference in the URL when switching views", () => {
    expect(
      viewFor({ conferenceParam: "east" }).viewOptions.map(({ href }) => href),
    ).toEqual(["/standings?conf=east", "/standings?view=leaders&conf=east"]);
  });

  it("offers the view switch while the standings are still loading", () => {
    expect(
      viewFor({ query: { status: "loading" }, viewParam: "leaders" })
        .selectedView,
    ).toBe("leaders");
  });
});
