import type { Game } from "@/app/lib/domain/game";
import type { NbaDate } from "@/app/lib/domain/nba-date";
import type { Standings } from "@/app/lib/domain/standings";
import type { TeamDetail } from "@/app/lib/domain/team";
import standingsFixture from "@/app/lib/espn/__fixtures__/standings-regular-season.json";
import lakersDetailFixture from "@/app/lib/espn/__fixtures__/team-detail-lakers.json";
import lakersScheduleFixture from "@/app/lib/espn/__fixtures__/team-schedule-lakers.json";
import {
  mapConferenceStandings,
  mapScheduleGame,
  mapSeason,
  mapTeamDetail,
} from "@/app/lib/espn/mappers";
import type {
  RawStandingsResponse,
  RawTeamDetailResponse,
  RawTeamScheduleResponse,
} from "@/app/lib/espn/raw-types";
import type { StandingsQueryState } from "@/app/lib/standings/standings-view";
import { strings } from "@/app/lib/strings";
import {
  buildTeamView,
  type TeamQueryState,
  type TeamReadyScreen,
  type TeamSchedule,
  type TeamScheduleExpansions,
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

// The fixture's Lakers beat the Warriors at home, then play the Clippers at home, the Jazz away,
// the Trail Blazers at home, and the Clippers away.
const [warriorsAtHome, clippersAtHome, jazzAway, blazersAtHome, clippersAway] =
  (
    (lakersScheduleFixture as unknown as RawTeamScheduleResponse).events ?? []
  ).map(mapScheduleGame);
const lakersGames = [
  warriorsAtHome,
  clippersAtHome,
  jazzAway,
  blazersAtHome,
  clippersAway,
];

const loadedStandings: StandingsQueryState = {
  status: "success",
  standings,
};

function viewFor({
  team = lakers,
  query = { status: "success", team },
  standingsQuery = loadedStandings,
  games = lakersGames,
  timeZone = "America/Los_Angeles",
  scheduleExpansions = { upcoming: 0, results: 0 },
  tabParam = null,
  favoriteTeamIds = [],
}: {
  team?: TeamDetail;
  query?: TeamQueryState;
  standingsQuery?: StandingsQueryState;
  games?: Game[] | null;
  timeZone?: string | null;
  scheduleExpansions?: TeamScheduleExpansions;
  tabParam?: string | null;
  favoriteTeamIds?: string[];
} = {}) {
  return buildTeamView({
    slug: team.slug,
    query,
    standingsQuery,
    games,
    timeZone,
    scheduleExpansions,
    tabParam,
    favoriteTeamIds,
  });
}

function scheduleOf(options: Parameters<typeof viewFor>[0] = {}): TeamSchedule {
  const schedule = readyScreenOf(viewFor(options).screen).schedule;
  if (!schedule) throw new Error("Expected the schedule to be loaded");
  return schedule;
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

  describe("follow", () => {
    it("offers to follow a team that is not a favorite", () => {
      const { follow } = readyScreenOf(
        viewFor({ favoriteTeamIds: [knicks.id] }).screen,
      );

      expect(follow).toEqual({
        teamId: lakers.id,
        isFollowing: false,
        label: strings.team.follow,
      });
    });

    it("shows a favorite team as followed", () => {
      const { follow } = readyScreenOf(
        viewFor({ favoriteTeamIds: [knicks.id, lakers.id] }).screen,
      );

      expect(follow).toEqual({
        teamId: lakers.id,
        isFollowing: true,
        label: strings.team.following,
      });
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

  describe("schedule", () => {
    it("lists the upcoming games soonest first", () => {
      const upcoming = scheduleOf({
        games: [
          clippersAway,
          blazersAtHome,
          warriorsAtHome,
          jazzAway,
          clippersAtHome,
        ],
      }).upcoming.items;

      expect(upcoming.map(({ id }) => id)).toEqual([
        clippersAtHome.id,
        jazzAway.id,
        blazersAtHome.id,
        clippersAway.id,
      ]);
    });

    it("shows each upcoming game's date, local time, opponent, and side", () => {
      const [clippersGame, jazzGame] = scheduleOf().upcoming.items;

      expect(clippersGame).toMatchObject({
        id: clippersAtHome.id,
        startTime: "2026-10-24T02:00Z",
        weekdayLabel: "Fri",
        dateLabel: "Oct 23",
        timeLabel: "7:00 PM",
        isHome: true,
        sideLabel: strings.team.schedule.versus,
        opponent: {
          name: "Clippers",
          displayName: "LA Clippers",
          logoUrl: clippersAtHome.away.team.logoUrl,
        },
      });
      expect(jazzGame).toMatchObject({
        isHome: false,
        sideLabel: strings.team.schedule.at,
        opponent: { name: "Jazz" },
      });
    });

    it("shows the tip-off date and time in the browser timezone", () => {
      const [clippersGame] = scheduleOf({ timeZone: "Asia/Tokyo" }).upcoming
        .items;

      expect(clippersGame).toMatchObject({
        weekdayLabel: "Sat",
        dateLabel: "Oct 24",
        timeLabel: "11:00 AM",
      });
    });

    it("shows the NBA date without a time until the browser timezone is known", () => {
      const [clippersGame] = scheduleOf({ timeZone: null }).upcoming.items;

      expect(clippersGame).toMatchObject({
        weekdayLabel: "Fri",
        dateLabel: "Oct 23",
        timeLabel: null,
      });
    });

    it("labels a game without ESPN or Prime Video as on NBA League Pass", () => {
      const [clippersGame] = scheduleOf().upcoming.items;

      expect(clippersGame.channelLabel).toBe("NBA League Pass");
    });

    it("labels a game by its channels", () => {
      const primeVideoGame: Game = {
        ...clippersAtHome,
        broadcasts: [{ name: "Prime Video", market: "national" }],
      };

      const [game] = scheduleOf({ games: [primeVideoGame] }).upcoming.items;

      expect(game.channelLabel).toBe("Prime Video");
    });

    it("flags the soonest game as the next one", () => {
      const upcoming = scheduleOf().upcoming.items;

      expect(upcoming.map(({ isNext }) => isNext)).toEqual([
        true,
        false,
        false,
        false,
      ]);
    });

    it("marks a postponed game and flags the next game after it", () => {
      const postponedGame: Game = {
        ...clippersAtHome,
        status: { kind: "postponed" },
      };

      const [postponed, jazzGame] = scheduleOf({
        games: [postponedGame, jazzAway],
      }).upcoming.items;

      expect(postponed).toMatchObject({ isPostponed: true, isNext: false });
      expect(jazzGame).toMatchObject({ isPostponed: false, isNext: true });
    });

    it("links each upcoming game to its game page", () => {
      const [clippersGame] = scheduleOf().upcoming.items;

      expect(clippersGame.href).toBe(`/game/${clippersAtHome.id}`);
    });

    it("lists the results newest first with a link to each game center", () => {
      const laterWin: Game = {
        ...warriorsAtHome,
        id: "later-win",
        startTime: "2026-10-23T02:00Z",
        nbaDate: "2026-10-22" as NbaDate,
      };

      const results = scheduleOf({ games: [warriorsAtHome, laterWin] }).results
        .items;

      expect(results.map(({ id, href }) => [id, href])).toEqual([
        ["later-win", "/game/later-win"],
        [warriorsAtHome.id, `/game/${warriorsAtHome.id}`],
      ]);
    });

    it("shows a win with the team's score first", () => {
      const [result] = scheduleOf().results.items;

      expect(result).toMatchObject({
        weekdayLabel: "Wed",
        dateLabel: "Oct 21",
        isHome: true,
        sideLabel: strings.team.schedule.versus,
        opponent: { name: "Warriors" },
        outcome: "win",
        outcomeLabel: "W",
        outcomeAccessibleLabel: "Win",
        score: "127-105",
        overtimeLabel: null,
      });
    });

    it("shows a loss away with the team's score first", () => {
      const awayLoss: Game = {
        ...jazzAway,
        status: { kind: "final", period: 4 },
        home: { ...jazzAway.home, score: 112, winner: true },
        away: { ...jazzAway.away, score: 104, winner: false },
      };

      const [result] = scheduleOf({ games: [awayLoss] }).results.items;

      expect(result).toMatchObject({
        isHome: false,
        sideLabel: strings.team.schedule.at,
        outcome: "loss",
        outcomeLabel: "L",
        outcomeAccessibleLabel: "Loss",
        score: "104-112",
      });
    });

    it.each([
      [5, "OT"],
      [6, "2OT"],
    ])(
      "marks a game that ended in period %i as %s",
      (period, overtimeLabel) => {
        const overtimeWin: Game = {
          ...warriorsAtHome,
          status: { kind: "final", period },
        };

        const [result] = scheduleOf({ games: [overtimeWin] }).results.items;

        expect(result.overtimeLabel).toBe(overtimeLabel);
      },
    );

    it("keeps live and canceled games out of the upcoming games and the results", () => {
      const liveGame: Game = {
        ...clippersAtHome,
        status: { kind: "live", period: 2, clock: "5:00" },
      };
      const canceledGame: Game = {
        ...jazzAway,
        status: { kind: "canceled" },
      };

      const schedule = scheduleOf({ games: [liveGame, canceledGame] });

      expect([schedule.upcoming.items, schedule.results.items]).toEqual([
        [],
        [],
      ]);
    });

    it("shows the offseason message when no games are left", () => {
      const schedule = scheduleOf({ games: [warriorsAtHome] });

      expect(schedule.upcoming.items).toEqual([]);
      expect(schedule.emptyUpcomingMessage).toBe(
        strings.team.schedule.offseason,
      );
    });

    it("leaves the offseason message out while games are left", () => {
      expect(scheduleOf().emptyUpcomingMessage).toBeNull();
    });

    describe("show more", () => {
      // Ten games a day apart from the Clippers game, as either upcoming games or results.
      function tenGamesLike(game: Game): Game[] {
        return Array.from({ length: 10 }, (_, dayOffset) => ({
          ...game,
          id: `game-${dayOffset}`,
          startTime: new Date(
            Date.parse(game.startTime) + dayOffset * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }));
      }

      it.each(["upcoming", "results"] as const)(
        "shows the first four %s and offers more",
        (listId) => {
          const games = tenGamesLike(
            listId === "upcoming" ? clippersAtHome : warriorsAtHome,
          );

          const list = scheduleOf({ games })[listId];

          expect(list.items).toHaveLength(4);
          expect(list.showMoreLabel).toBe(strings.team.schedule.showMore);
        },
      );

      it.each(["upcoming", "results"] as const)(
        "adds five %s per expansion and offers more while games are left",
        (listId) => {
          const games = tenGamesLike(
            listId === "upcoming" ? clippersAtHome : warriorsAtHome,
          );
          const scheduleExpansions = { upcoming: 0, results: 0, [listId]: 1 };

          const list = scheduleOf({ games, scheduleExpansions })[listId];

          expect(list.items).toHaveLength(9);
          expect(list.showMoreLabel).toBe(strings.team.schedule.showMore);
        },
      );

      it("stops offering more once every game shows", () => {
        const games = tenGamesLike(clippersAtHome);

        const { upcoming } = scheduleOf({
          games,
          scheduleExpansions: { upcoming: 2, results: 0 },
        });

        expect(upcoming.items).toHaveLength(10);
        expect(upcoming.showMoreLabel).toBeNull();
      });

      it("offers nothing more for four games or fewer", () => {
        const { upcoming, results } = scheduleOf();

        expect([upcoming.showMoreLabel, results.showMoreLabel]).toEqual([
          null,
          null,
        ]);
      });

      it("expands the upcoming games and the results separately", () => {
        const games = [
          ...tenGamesLike(clippersAtHome),
          ...tenGamesLike(warriorsAtHome).map((game) => ({
            ...game,
            id: `result-${game.id}`,
          })),
        ];

        const { upcoming, results } = scheduleOf({
          games,
          scheduleExpansions: { upcoming: 1, results: 0 },
        });

        expect([upcoming.items.length, results.items.length]).toEqual([9, 4]);
      });
    });

    it("leaves the schedule out until it loads", () => {
      const screen = viewFor({ games: null }).screen;

      expect(readyScreenOf(screen).schedule).toBeNull();
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
