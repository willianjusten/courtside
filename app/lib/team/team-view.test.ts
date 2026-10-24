import type { Standings } from "@/app/lib/domain/standings";
import type { TeamDetail } from "@/app/lib/domain/team";
import standingsFixture from "@/app/lib/espn/__fixtures__/standings-regular-season.json";
import lakersDetailFixture from "@/app/lib/espn/__fixtures__/team-detail-lakers.json";
import {
  mapConferenceStandings,
  mapSeason,
  mapTeamDetail,
} from "@/app/lib/espn/mappers";
import type {
  RawStandingsResponse,
  RawTeamDetailResponse,
} from "@/app/lib/espn/raw-types";
import type { StandingsQueryState } from "@/app/lib/standings/standings-view";
import { strings } from "@/app/lib/strings";
import {
  buildTeamView,
  type TeamQueryState,
  type TeamReadyScreen,
  type TeamScreen,
} from "./team-view";

const lakers = mapTeamDetail(
  (lakersDetailFixture as unknown as RawTeamDetailResponse).team,
);
const rawStandings = standingsFixture as unknown as RawStandingsResponse;
const standings: Standings = {
  season: mapSeason(rawStandings, new Date("2026-10-23T12:00:00Z")),
  conferences: (rawStandings.children ?? []).map(mapConferenceStandings),
};

// The fixture's Knicks share the 9th seed in the East and have lost their only game.
const knicks: TeamDetail = {
  ...lakers,
  id: "18",
  name: "Knicks",
  displayName: "New York Knicks",
  location: "New York",
  slug: "knicks",
  record: "0-1",
};
// The fixture's Nuggets have not played yet.
const nuggets: TeamDetail = { ...lakers, id: "7", slug: "nuggets" };

const loadedStandings: StandingsQueryState = {
  status: "success",
  standings,
};

function viewFor({
  team = lakers,
  query = { status: "success", team },
  standingsQuery = loadedStandings,
  tabParam = null,
}: {
  team?: TeamDetail;
  query?: TeamQueryState;
  standingsQuery?: StandingsQueryState;
  tabParam?: string | null;
} = {}) {
  return buildTeamView({
    slug: team.slug,
    query,
    standingsQuery,
    tabParam,
  });
}

function readyScreenOf(screen: TeamScreen): TeamReadyScreen {
  if (screen.kind !== "ready") {
    throw new Error(`Expected the ready screen, got ${screen.kind}`);
  }
  return screen;
}

describe("buildTeamView", () => {
  describe("header", () => {
    it("names the team with its logo", () => {
      const { header } = readyScreenOf(viewFor().screen);

      expect(header).toMatchObject({
        name: "Lakers",
        displayName: "Los Angeles Lakers",
        location: "Los Angeles",
        logoUrl: "https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/lal.png",
      });
    });

    it("shows the record, the conference rank with its ordinal, and the streak", () => {
      const { header } = readyScreenOf(viewFor().screen);

      expect(header).toMatchObject({
        conferenceName: "Western Conference",
        record: "1-0",
        rankLabel: "4th West",
        zone: "playoff",
        streak: "W1",
        streakKind: "win",
      });
    });

    it("ranks a team sharing a seed by that seed and shows a losing streak", () => {
      const { header } = readyScreenOf(viewFor({ team: knicks }).screen);

      expect(header).toMatchObject({
        record: "0-1",
        rankLabel: "9th East",
        zone: "play-in",
        streak: "L1",
        streakKind: "loss",
      });
    });

    it("leaves the streak out for a team that has not played", () => {
      const { header } = readyScreenOf(viewFor({ team: nuggets }).screen);

      expect(header).toMatchObject({
        record: "0-0",
        rankLabel: "8th West",
        streak: null,
        streakKind: null,
      });
    });

    it.each([
      [1, "1st"],
      [2, "2nd"],
      [3, "3rd"],
      [11, "11th"],
      [12, "12th"],
      [13, "13th"],
    ])("writes seed %i as %s", (seed, ordinal) => {
      const westRows = standings.conferences[1].rows.map((row) =>
        row.team.id === lakers.id ? { ...row, seed } : row,
      );
      const { header } = readyScreenOf(
        viewFor({
          standingsQuery: {
            status: "success",
            standings: {
              ...standings,
              conferences: [
                standings.conferences[0],
                { ...standings.conferences[1], rows: westRows },
              ],
            },
          },
        }).screen,
      );

      expect(header.rankLabel).toBe(`${ordinal} West`);
      expect(header.zone).toBe(
        seed <= 6 ? "playoff" : seed <= 10 ? "play-in" : "none",
      );
    });

    it("falls back to the team's own record until the standings load", () => {
      const { header } = readyScreenOf(
        viewFor({ standingsQuery: { status: "loading" } }).screen,
      );

      expect(header).toMatchObject({
        record: "1-0",
        conferenceName: null,
        rankLabel: null,
        zone: null,
        streak: null,
      });
    });

    it("keeps the header when the standings fail to load", () => {
      const { header } = readyScreenOf(
        viewFor({ standingsQuery: { status: "error" } }).screen,
      );

      expect(header.record).toBe("1-0");
      expect(header.rankLabel).toBeNull();
    });

    it("colors the team through the contrast rule", () => {
      const { header } = readyScreenOf(viewFor().screen);

      // The Lakers purple is too dark on the Ink ground, so their gold leads.
      expect(header.colors).toEqual({ accent: "#fdb927", shade: "#552583" });
    });

    it("falls back to the neutral color for a team without colors", () => {
      const { header } = readyScreenOf(
        viewFor({
          team: { ...lakers, color: null, alternateColor: null },
        }).screen,
      );

      expect(header.colors).toEqual({ accent: "#9aa3b5", shade: "#9aa3b5" });
    });
  });

  describe("tiles", () => {
    it("shows the home, away, and last 10 records", () => {
      const { tiles } = readyScreenOf(viewFor().screen);

      expect(tiles).toEqual([
        { id: "home", label: strings.team.tiles.home, value: "1-0" },
        { id: "away", label: strings.team.tiles.away, value: "0-0" },
        { id: "lastTen", label: strings.team.tiles.lastTen, value: "1-0" },
      ]);
    });

    it("sums up the home and away records for the desktop header", () => {
      const { homeAwayLabel } = readyScreenOf(viewFor().screen);

      expect(homeAwayLabel).toBe("Home 1-0 · Away 0-0");
    });

    it("leaves the tiles out until the standings load", () => {
      const screen = readyScreenOf(
        viewFor({ standingsQuery: { status: "loading" } }).screen,
      );

      expect(screen.tiles).toBeNull();
      expect(screen.homeAwayLabel).toBeNull();
    });

    it("keeps the last standings' tiles when a refetch failed", () => {
      const { tiles } = readyScreenOf(
        viewFor({ standingsQuery: { status: "stale", standings } }).screen,
      );

      expect(tiles?.map((tile) => tile.value)).toEqual(["1-0", "0-0", "1-0"]);
    });
  });

  describe("standings link", () => {
    it("opens the full standings on the team's conference", () => {
      expect(readyScreenOf(viewFor().screen).standingsHref).toBe(
        "/standings?conf=west",
      );
    });

    it("opens the full standings until the conference is known", () => {
      expect(
        readyScreenOf(viewFor({ standingsQuery: { status: "error" } }).screen)
          .standingsHref,
      ).toBe("/standings");
    });
  });

  describe("screen", () => {
    it.each(["loading", "error"] as const)(
      "is %s while the team is",
      (status) => {
        expect(viewFor({ query: { status } }).screen).toEqual({
          kind: status,
        });
      },
    );

    it("keeps the last team when a refetch failed", () => {
      const screen = viewFor({
        query: { status: "stale", team: lakers },
      }).screen;

      expect(readyScreenOf(screen).header.displayName).toBe(
        "Los Angeles Lakers",
      );
    });
  });

  describe("tabs", () => {
    it("selects the schedule by default", () => {
      expect(viewFor().tabs).toEqual({
        selected: "schedule",
        items: [
          {
            id: "schedule",
            label: strings.team.tabs.schedule,
            href: "/teams/lakers",
          },
          {
            id: "roster",
            label: strings.team.tabs.roster,
            href: "/teams/lakers?tab=roster",
          },
          {
            id: "standings",
            label: strings.team.tabs.standings,
            href: "/teams/lakers?tab=standings",
          },
        ],
      });
    });

    it.each(["roster", "standings"] as const)(
      "selects the %s tab from the query string",
      (tab) => {
        expect(viewFor({ tabParam: tab }).tabs.selected).toBe(tab);
      },
    );

    it("falls back to the schedule for an unknown tab", () => {
      expect(viewFor({ tabParam: "stats" }).tabs.selected).toBe("schedule");
    });

    it("keeps the tabs while the team loads", () => {
      expect(
        viewFor({ query: { status: "loading" }, tabParam: "roster" }).tabs
          .selected,
      ).toBe("roster");
    });
  });
});
