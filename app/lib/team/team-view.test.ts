import type { Game, PlayoffGame } from "@/app/lib/domain/game";
import type { NbaDate } from "@/app/lib/domain/nba-date";
import type { Standings } from "@/app/lib/domain/standings";
import type { RosterPlayer, TeamDetail } from "@/app/lib/domain/team";
import standingsFixture from "@/app/lib/espn/__fixtures__/standings-regular-season.json";
import lakersDetailFixture from "@/app/lib/espn/__fixtures__/team-detail-lakers.json";
import lakersRosterFixture from "@/app/lib/espn/__fixtures__/team-roster-lakers.json";
import lakersScheduleFixture from "@/app/lib/espn/__fixtures__/team-schedule-lakers.json";
import lakersPostseasonScheduleFixture from "@/app/lib/espn/__fixtures__/team-schedule-lakers-postseason.json";
import lakersLiveScoreboardFixture from "@/app/lib/espn/__fixtures__/scoreboard-lakers-live-simulated.json";
import lakersFinalScoreboardFixture from "@/app/lib/espn/__fixtures__/scoreboard-lakers-final.json";
import liveDayScoreboardFixture from "@/app/lib/espn/__fixtures__/scoreboard-live-day-simulated.json";
import {
  mapConferenceStandings,
  mapGame,
  mapPlayoffScheduleGame,
  mapRosterPlayer,
  mapScheduleGame,
  mapSeason,
  mapTeamDetail,
} from "@/app/lib/espn/mappers";
import type {
  RawRosterResponse,
  RawScoreboard,
  RawStandingsResponse,
  RawTeamDetailResponse,
  RawTeamScheduleResponse,
} from "@/app/lib/espn/raw-types";
import type { StandingsQueryState } from "@/app/lib/standings/standings-view";
import { strings } from "@/app/lib/strings";
import {
  buildTeamView,
  scoreboardDateOf,
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

// The fixture's Lakers beat the Rockets 4-2 in the West 1st Round, then lost 4-0 to the Thunder in the West Semifinals.
const lakersPlayoffGames = (
  (lakersPostseasonScheduleFixture as unknown as RawTeamScheduleResponse)
    .events ?? []
).map(mapPlayoffScheduleGame);
const firstRoundGames = lakersPlayoffGames.slice(0, 6);
const [rocketsGameOne, rocketsGameTwo, rocketsGameThree, rocketsGameFour] =
  firstRoundGames;

// A playoff game as the schedule lists it before tip-off.
function playoffGameBeforeTipOff(game: PlayoffGame): PlayoffGame {
  return {
    ...game,
    status: { kind: "scheduled" },
    home: { ...game.home, score: 0, winner: false },
    away: { ...game.away, score: 0, winner: false },
  };
}

function scoreboardGamesOf(fixture: unknown): Game[] {
  return ((fixture as RawScoreboard).events ?? []).map(mapGame);
}

// The Warriors game at 4:21 in the 3rd quarter, then final, as the scoreboard reports it.
const [warriorsLive] = scoreboardGamesOf(lakersLiveScoreboardFixture);
const [warriorsFinal] = scoreboardGamesOf(lakersFinalScoreboardFixture);
// The schedule as cached before the Warriors game tipped off.
const warriorsBeforeTipOff: Game = {
  ...warriorsAtHome,
  status: { kind: "scheduled" },
  home: { ...warriorsAtHome.home, score: 0, winner: false },
  away: { ...warriorsAtHome.away, score: 0, winner: false },
};
const gamesBeforeTipOff = [warriorsBeforeTipOff, ...lakersGames.slice(1)];

// In ESPN's order, which lists the players by last name.
const lakersPlayers = (
  (lakersRosterFixture as unknown as RawRosterResponse).athletes ?? []
).map((athlete) => mapRosterPlayer(athlete));

function rosterPlayerOf(overrides: Partial<RosterPlayer>): RosterPlayer {
  return {
    id: "1",
    displayName: "Player",
    jersey: null,
    position: null,
    height: null,
    weight: null,
    age: null,
    headshotUrl: null,
    injuryStatus: null,
    injuryComment: null,
    ...overrides,
  };
}

const loadedStandings: StandingsQueryState = {
  status: "success",
  standings,
};

function viewFor({
  team = lakers,
  query = { status: "success", team },
  standingsQuery = loadedStandings,
  games = lakersGames,
  playoffGames = null,
  scoreboardGames = null,
  players = lakersPlayers,
  timeZone = "America/Los_Angeles",
  scheduleExpansions = { upcoming: 0, results: 0 },
  tabParam = null,
  favoriteTeamIds = [],
}: {
  team?: TeamDetail;
  query?: TeamQueryState;
  standingsQuery?: StandingsQueryState;
  games?: Game[] | null;
  playoffGames?: PlayoffGame[] | null;
  scoreboardGames?: Game[] | null;
  players?: RosterPlayer[] | null;
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
    playoffGames,
    scoreboardGames,
    players,
    timeZone,
    scheduleExpansions,
    tabParam,
    favoriteTeamIds,
  });
}

function rosterOf(options: Parameters<typeof viewFor>[0] = {}) {
  const roster = readyScreenOf(viewFor(options).screen).roster;
  if (!roster) throw new Error("Expected the roster to be loaded");
  return roster;
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

    describe("live game", () => {
      it("shows the team's live game from the scoreboard over the cached schedule", () => {
        const schedule = scheduleOf({
          games: gamesBeforeTipOff,
          scoreboardGames: [warriorsLive],
        });

        expect(schedule.live).toMatchObject({
          id: warriorsAtHome.id,
          isHome: true,
          sideLabel: strings.team.schedule.versus,
          opponent: { name: "Warriors" },
          statusLabel: "Q3 4:21",
          score: "88-64",
          href: `/game/${warriorsAtHome.id}`,
        });
        expect(schedule.upcoming.items.map(({ id }) => id)).not.toContain(
          warriorsAtHome.id,
        );
      });

      it("labels the live game's channel next to its status", () => {
        const { live } = scheduleOf({
          games: gamesBeforeTipOff,
          scoreboardGames: [warriorsLive],
        });

        expect(live).toMatchObject({
          channelLabel: "ESPN",
          metaLabel: "Q3 4:21 · ESPN",
        });
      });

      it("shows halftime as the live game's status", () => {
        const warriorsAtHalftime: Game = {
          ...warriorsLive,
          status: { kind: "halftime", period: 2 },
        };

        const { live } = scheduleOf({
          games: gamesBeforeTipOff,
          scoreboardGames: [warriorsAtHalftime],
        });

        expect(live?.statusLabel).toBe(strings.gameStatus.halftime);
      });

      it("moves the game to the results once the scoreboard reports it final", () => {
        const cachedWhileLive: Game = {
          ...warriorsLive,
          status: { kind: "live", period: 2, clock: "5:00" },
        };

        const schedule = scheduleOf({
          games: [cachedWhileLive, ...lakersGames.slice(1)],
          scoreboardGames: [warriorsFinal],
        });

        expect(schedule.live).toBeNull();
        expect(schedule.results.items[0]).toMatchObject({
          id: warriorsAtHome.id,
          score: "127-105",
        });
      });

      it("shows the cached live game until the scoreboard loads", () => {
        const cachedWhileLive: Game = {
          ...warriorsLive,
          status: { kind: "live", period: 2, clock: "5:00" },
        };

        const { live } = scheduleOf({
          games: [cachedWhileLive, ...lakersGames.slice(1)],
        });

        expect(live?.statusLabel).toBe("Q2 5:00");
      });

      it("leaves the live game out while the team is not playing", () => {
        const schedule = scheduleOf({
          scoreboardGames: scoreboardGamesOf(liveDayScoreboardFixture),
        });

        expect(schedule.live).toBeNull();
        expect(schedule.upcoming.items.map(({ id }) => id)).toEqual(
          scheduleOf().upcoming.items.map(({ id }) => id),
        );
      });
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

    describe("playoffs", () => {
      it("lists each playoff series newest first with its round, opponent, and result", () => {
        const { playoffs } = scheduleOf({ playoffGames: lakersPlayoffGames });

        expect(playoffs).toEqual([
          expect.objectContaining({
            roundName: "West Semifinals",
            opponent: expect.objectContaining({
              name: "Thunder",
              displayName: "Oklahoma City Thunder",
            }),
            statusLabel: "OKC wins 4-0",
          }),
          expect.objectContaining({
            roundName: "West 1st Round",
            opponent: expect.objectContaining({ name: "Rockets" }),
            statusLabel: "LAL wins 4-2",
          }),
        ]);
      });

      it("lists a series' games from Game 1 with W/L, score, and side", () => {
        const [, rocketsSeries] =
          scheduleOf({ playoffGames: lakersPlayoffGames }).playoffs ?? [];

        expect(
          rocketsSeries.games.map((game) => [
            game.kind,
            game.gameLabel,
            game.sideLabel,
            game.kind === "result" ? game.outcomeLabel : null,
            game.kind === "result" ? game.score : null,
          ]),
        ).toEqual([
          ["result", "Game 1", "vs", "W", "107-98"],
          ["result", "Game 2", "vs", "W", "101-94"],
          ["result", "Game 3", "@", "W", "112-108"],
          ["result", "Game 4", "@", "L", "96-115"],
          ["result", "Game 5", "vs", "L", "93-99"],
          ["result", "Game 6", "@", "W", "98-78"],
        ]);
        expect(rocketsSeries.games[0]).toMatchObject({
          id: rocketsGameOne.id,
          outcomeAccessibleLabel: "Win",
          href: `/game/${rocketsGameOne.id}`,
        });
      });

      it("shows the series leader while the series is under way", () => {
        const [series] =
          scheduleOf({
            playoffGames: [rocketsGameOne, rocketsGameTwo, rocketsGameThree],
          }).playoffs ?? [];

        expect(series.statusLabel).toBe("LAL leads 3-0");
      });

      it("shows a tied series", () => {
        const [series] =
          scheduleOf({ playoffGames: [rocketsGameOne, rocketsGameFour] })
            .playoffs ?? [];

        expect(series.statusLabel).toBe("Series tied 1-1");
      });

      it("shows an upcoming playoff game with its local time and channel, flagged as next", () => {
        const [series] =
          scheduleOf({
            playoffGames: [
              rocketsGameOne,
              rocketsGameTwo,
              playoffGameBeforeTipOff(rocketsGameThree),
              playoffGameBeforeTipOff(rocketsGameFour),
            ],
          }).playoffs ?? [];

        expect(series.statusLabel).toBe("LAL leads 2-0");
        expect(series.games.slice(2)).toEqual([
          expect.objectContaining({
            kind: "upcoming",
            gameLabel: "Game 3",
            weekdayLabel: "Fri",
            dateLabel: "Apr 24",
            timeLabel: "5:00 PM",
            channelLabel: "Prime Video",
            isNext: true,
          }),
          expect.objectContaining({ kind: "upcoming", isNext: false }),
        ]);
      });

      it("shows a live playoff game from the scoreboard in its series, not in Up next", () => {
        const rocketsGameThreeLive: Game = {
          ...rocketsGameThree,
          status: { kind: "live", period: 3, clock: "4:21" },
          home: { ...rocketsGameThree.home, score: 70 },
          away: { ...rocketsGameThree.away, score: 75 },
        };

        const schedule = scheduleOf({
          playoffGames: [
            rocketsGameOne,
            rocketsGameTwo,
            playoffGameBeforeTipOff(rocketsGameThree),
          ],
          scoreboardGames: [rocketsGameThreeLive],
        });
        const [series] = schedule.playoffs ?? [];

        expect(series.games[2]).toMatchObject({
          kind: "live",
          gameLabel: "Game 3",
          statusLabel: "Q3 4:21",
          score: "75-70",
        });
        expect(schedule.live).toBeNull();
      });

      it("labels a playoff game without ESPN's note by its date alone", () => {
        const [series] =
          scheduleOf({
            playoffGames: [
              { ...rocketsGameOne, roundName: null, gameNumber: null },
            ],
          }).playoffs ?? [];

        expect(series).toMatchObject({ roundName: null });
        expect(series.games[0].gameLabel).toBeNull();
      });

      it("keeps the regular season lists to the regular season", () => {
        const schedule = scheduleOf({ playoffGames: lakersPlayoffGames });

        expect(schedule.results.items.map(({ id }) => id)).toEqual([
          warriorsAtHome.id,
        ]);
        expect(schedule.upcoming.items).toHaveLength(4);
      });

      it("replaces the offseason message once the regular season is over", () => {
        const schedule = scheduleOf({
          games: [warriorsAtHome],
          playoffGames: lakersPlayoffGames,
        });

        expect(schedule.upcoming.items).toEqual([]);
        expect(schedule.emptyUpcomingMessage).toBeNull();
      });

      it("leaves the playoffs out outside the postseason", () => {
        expect(scheduleOf({ playoffGames: [] }).playoffs).toBeNull();
      });

      it("leaves the playoffs out until the playoff schedule loads", () => {
        expect(scheduleOf({ playoffGames: null }).playoffs).toBeNull();
      });
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

  describe("roster", () => {
    it("sorts the players by position group, then jersey number", () => {
      expect(
        rosterOf().map(({ jersey, position }) => `${position} ${jersey}`),
      ).toEqual([
        "G 4",
        "G 5",
        "G 7",
        "G 9",
        "G 10",
        "G 15",
        "G 30",
        "G 43",
        "G 77",
        "F 1",
        "F 2",
        "F 11",
        "F 12",
        "F 31",
        "F 47",
        "F 54",
        "F 55",
        "C 14",
      ]);
    });

    it("groups detailed positions by their main one", () => {
      const roster = rosterOf({
        players: [
          rosterPlayerOf({ id: "center", position: "C", jersey: "1" }),
          rosterPlayerOf({ id: "small-forward", position: "SF", jersey: "2" }),
          rosterPlayerOf({ id: "point-guard", position: "PG", jersey: "3" }),
          rosterPlayerOf({ id: "guard-forward", position: "G-F", jersey: "1" }),
        ],
      });

      expect(roster.map(({ id }) => id)).toEqual([
        "guard-forward",
        "point-guard",
        "small-forward",
        "center",
      ]);
    });

    it("puts players without a position or a jersey number last", () => {
      const roster = rosterOf({
        players: [
          rosterPlayerOf({ id: "no-position", position: null, jersey: "0" }),
          rosterPlayerOf({ id: "no-jersey", position: "G", jersey: null }),
          rosterPlayerOf({ id: "double-zero", position: "G", jersey: "00" }),
          rosterPlayerOf({ id: "zero", position: "G", jersey: "0" }),
        ],
      });

      expect(roster.map(({ id }) => id)).toEqual([
        "zero",
        "double-zero",
        "no-jersey",
        "no-position",
      ]);
    });

    it("shows each player's number, name, position, age, height, and headshot", () => {
      const lukaDoncic = rosterOf().find(({ id }) => id === "3945274");

      expect(lukaDoncic).toEqual({
        id: "3945274",
        jersey: "77",
        name: "Luka Doncic",
        position: "G",
        age: 27,
        height: `6' 8"`,
        headshotUrl:
          "https://a.espncdn.com/i/headshots/nba/players/full/3945274.png",
        injuryStatus: null,
        injuryComment: null,
      });
    });

    it("marks injured players with their status", () => {
      expect(
        rosterOf()
          .filter(({ injuryStatus }) => injuryStatus)
          .map(({ name, injuryStatus }) => `${name}: ${injuryStatus}`),
      ).toEqual([
        "Collin Sexton: Day-To-Day",
        "Cameron Carr: Day-To-Day",
        "Adou Thiero: Day-To-Day",
        "Jake LaRavia: Day-To-Day",
      ]);
    });

    it("explains an injury with ESPN's report on it", () => {
      const comment =
        "Carr (oblique) is out for Friday's game against the Clippers.";
      const [cameronCarr] = rosterOf({
        players: [
          rosterPlayerOf({
            injuryStatus: "Day-To-Day",
            injuryComment: comment,
          }),
        ],
      });

      expect(cameronCarr.injuryComment).toBe(comment);
    });

    it("leaves the roster out until it loads", () => {
      const screen = viewFor({ players: null }).screen;

      expect(readyScreenOf(screen).roster).toBeNull();
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
        ],
      });
    });

    it("selects the roster tab from the query string", () => {
      expect(viewFor({ tabParam: "roster" }).tabs.selected).toBe("roster");
    });

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

describe("scoreboardDateOf", () => {
  // The Clippers game tips off at 10 PM Eastern on Oct 23.
  const clippersGameDay = new Date("2026-10-23T16:00:00Z");

  it("reads today's scoreboard when the team plays today", () => {
    expect(scoreboardDateOf(lakersGames, clippersGameDay)).toBe("2026-10-23");
  });

  it("reads no scoreboard when the team does not play today", () => {
    expect(
      scoreboardDateOf(lakersGames, new Date("2026-10-26T16:00:00Z")),
    ).toBeNull();
  });

  it("keeps reading the scoreboard of a live game past midnight Eastern", () => {
    const clippersLive: Game = {
      ...clippersAtHome,
      status: { kind: "live", period: 4, clock: "2:00" },
    };

    expect(
      scoreboardDateOf(
        [clippersLive, ...lakersGames.slice(2)],
        new Date("2026-10-24T04:30:00Z"),
      ),
    ).toBe(clippersAtHome.nbaDate);
  });

  it("reads no scoreboard until the schedule loads", () => {
    expect(scoreboardDateOf(null, clippersGameDay)).toBeNull();
  });
});
