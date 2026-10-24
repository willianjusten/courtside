import type { Game } from "@/app/lib/domain/game";
import type {
  GameSummary,
  TeamStatistics,
} from "@/app/lib/domain/game-summary";
import doubleOvertimePlayoffSummary from "@/app/lib/espn/__fixtures__/summary-final-double-overtime-playoff.json";
import overtimePlayoffSummary from "@/app/lib/espn/__fixtures__/summary-final-overtime-playoff.json";
import finalSummary from "@/app/lib/espn/__fixtures__/summary-final.json";
import liveSimulatedSummary from "@/app/lib/espn/__fixtures__/summary-live-simulated.json";
import liveFirstQuarterSummary from "@/app/lib/espn/__fixtures__/summary-live.json";
import preGameSummary from "@/app/lib/espn/__fixtures__/summary-pre-game-tonight.json";
import { mapGameSummary } from "@/app/lib/espn/mappers";
import type { RawSummary } from "@/app/lib/espn/raw-types";
import { strings } from "@/app/lib/strings";
import {
  buildGameView,
  type BoxScoreView,
  type GameLeadersView,
  type GameHeader,
  type GameScreen,
  type GameSummaryQueryState,
  type GameTabs,
  type LineScoreView,
  type TeamStatsView,
} from "./game-view";

const summaryOf = (fixture: unknown) => mapGameSummary(fixture as RawSummary);

const final = summaryOf(finalSummary);
const live = summaryOf(liveSimulatedSummary);
const liveFirstQuarter = summaryOf(liveFirstQuarterSummary);
const preGame = summaryOf(preGameSummary);
const overtimePlayoff = summaryOf(overtimePlayoffSummary);
const doubleOvertimePlayoff = summaryOf(doubleOvertimePlayoffSummary);

function withGame(summary: GameSummary, game: Partial<Game>): GameSummary {
  return { ...summary, game: { ...summary.game, ...game } };
}

function screenFor(
  summary: GameSummary,
  timeZone: string | null = "America/New_York",
): GameScreen {
  return buildGameView({
    query: { status: "success", summary },
    timeZone,
    tabParam: null,
  }).screen;
}

function headerOf(screen: GameScreen): GameHeader {
  if (screen.kind === "loading" || screen.kind === "error") {
    throw new Error(`Expected a game screen, got ${screen.kind}`);
  }
  return screen.header;
}

function lineScoreOf(screen: GameScreen): LineScoreView {
  if (screen.kind !== "live" && screen.kind !== "final") {
    throw new Error(`Expected a live or final screen, got ${screen.kind}`);
  }
  return screen.lineScore;
}

function tabsFor(summary: GameSummary, tabParam: string | null): GameTabs {
  const { screen } = buildGameView({
    query: { status: "success", summary },
    timeZone: "America/New_York",
    tabParam,
  });
  if (screen.kind !== "live" && screen.kind !== "final") {
    throw new Error(`Expected a live or final screen, got ${screen.kind}`);
  }
  return screen.tabs;
}

function boxScoreFor(summary: GameSummary): BoxScoreView | null {
  const screen = screenFor(summary);
  if (screen.kind !== "live" && screen.kind !== "final") {
    throw new Error(`Expected a live or final screen, got ${screen.kind}`);
  }
  return screen.boxScore;
}

function teamStatsFor(summary: GameSummary): TeamStatsView | null {
  const screen = screenFor(summary);
  if (screen.kind !== "live" && screen.kind !== "final") {
    throw new Error(`Expected a live or final screen, got ${screen.kind}`);
  }
  return screen.teamStats;
}

function leadersFor(summary: GameSummary): GameLeadersView | null {
  const screen = screenFor(summary);
  if (screen.kind !== "live" && screen.kind !== "final") {
    throw new Error(`Expected a live or final screen, got ${screen.kind}`);
  }
  return screen.leaders;
}

function withTeamStats(
  summary: GameSummary,
  teamStats: Partial<Record<"home" | "away", Partial<TeamStatistics>>>,
): GameSummary {
  const { home, away } = summary.teamStats;
  if (!home || !away) throw new Error("Expected team statistics");
  return {
    ...summary,
    teamStats: {
      home: { ...home, ...teamStats.home },
      away: { ...away, ...teamStats.away },
    },
  };
}

// The overtime playoff final played live, to cover an injured player during a live game.
const liveWithInjury = withGame(overtimePlayoff, {
  status: { kind: "live", period: 3, clock: "4:10" },
});

// ESPN's team stats for the game, read straight from the fixture, to check the box score totals against.
function teamStatOf(fixture: unknown, teamId: string, statName: string) {
  const { boxscore } = fixture as {
    boxscore: {
      teams: {
        team: { id: string };
        statistics: { name: string; displayValue: string }[];
      }[];
    };
  };
  return boxscore.teams
    .find(({ team }) => team.id === teamId)
    ?.statistics.find(({ name }) => name === statName)?.displayValue;
}

const headerFor = (summary: GameSummary, timeZone?: string | null) =>
  headerOf(screenFor(summary, timeZone));
const lineScoreFor = (summary: GameSummary) => lineScoreOf(screenFor(summary));

describe("buildGameView", () => {
  describe("screen states", () => {
    it("shows a loading state while the summary is pending", () => {
      expect(
        buildGameView({
          query: { status: "loading" },
          timeZone: null,
          tabParam: null,
        }),
      ).toEqual({ screen: { kind: "loading" }, staleNotice: null });
    });

    it("shows an error when the summary fails to load", () => {
      expect(
        buildGameView({
          query: { status: "error" },
          timeZone: null,
          tabParam: null,
        }),
      ).toEqual({ screen: { kind: "error" }, staleNotice: null });
    });

    it("shows the game without a stale notice once the summary loads", () => {
      const view = buildGameView({
        query: { status: "success", summary: final },
        timeZone: null,
        tabParam: null,
      });

      expect(view.screen.kind).toBe("final");
      expect(view.staleNotice).toBeNull();
    });

    it("keeps the last game with a stale notice when a refetch fails", () => {
      const query: GameSummaryQueryState = { status: "stale", summary: live };

      const view = buildGameView({ query, timeZone: null, tabParam: null });

      expect(view.screen).toEqual(screenFor(live, null));
      expect(view.screen.kind).toBe("live");
      expect(view.staleNotice).toBe(strings.game.stale);
    });

    it("picks the pre-game, live, final, or postponed screen from the game status", () => {
      expect(screenFor(preGame).kind).toBe("pre-game");
      expect(screenFor(live).kind).toBe("live");
      expect(
        screenFor(withGame(live, { status: { kind: "halftime", period: 2 } }))
          .kind,
      ).toBe("live");
      expect(screenFor(final).kind).toBe("final");
      expect(
        screenFor(withGame(preGame, { status: { kind: "postponed" } })).kind,
      ).toBe("postponed");
      expect(
        screenFor(withGame(preGame, { status: { kind: "canceled" } })).kind,
      ).toBe("postponed");
    });
  });

  describe("header", () => {
    it("shows both teams with logo, name, record, side, and team page link", () => {
      const { title, away, home } = headerFor(final);

      expect(title).toBe("Golden State Warriors at Los Angeles Lakers");
      expect(away).toMatchObject({
        name: "Warriors",
        displayName: "Golden State Warriors",
        abbreviation: "GS",
        logoUrl: "https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/gs.png",
        recordLabel: "0-1 · away",
        href: "/teams/warriors",
      });
      expect(home).toMatchObject({
        name: "Lakers",
        recordLabel: "1-0 · home",
        href: "/teams/lakers",
      });
    });

    it("links a team with a multi-word name to its team page slug", () => {
      const { home } = headerFor(
        withGame(final, {
          home: {
            ...final.game.home,
            team: { ...final.game.home.team, name: "Trail Blazers" },
          },
        }),
      );

      expect(home.href).toBe("/teams/trail-blazers");
    });

    it("emphasizes the winner of a final game and dims the loser", () => {
      const { away, home, leadingSide } = headerFor(final);

      expect(leadingSide).toBe("home");
      expect(home).toMatchObject({
        score: 127,
        isLeading: true,
        isDimmed: false,
      });
      expect(away).toMatchObject({
        score: 105,
        isLeading: false,
        isDimmed: true,
      });
    });

    it("emphasizes the leading side of a live game without dimming the other", () => {
      const { away, home, leadingSide } = headerFor(live);

      expect(leadingSide).toBe("away");
      expect(away).toMatchObject({ score: 70, isLeading: true });
      expect(home).toMatchObject({
        score: 66,
        isLeading: false,
        isDimmed: false,
      });
    });

    it("emphasizes no side in a tied game", () => {
      const tied = withGame(live, {
        home: { ...live.game.home, score: 70 },
      });

      const { away, home, leadingSide } = headerFor(tied);

      expect(leadingSide).toBeNull();
      expect(away.isLeading).toBe(false);
      expect(home.isLeading).toBe(false);
    });

    it("shows no score before tip-off", () => {
      const { away, home, leadingSide } = headerFor(preGame);

      expect(away.score).toBeNull();
      expect(home.score).toBeNull();
      expect(leadingSide).toBeNull();
    });

    it("dates the game and links back to its day's games", () => {
      expect(headerFor(final)).toMatchObject({
        dateLabel: "Wed, Oct 21",
        back: { href: "/games/2026-10-21", label: "Wednesday, October 21" },
      });
    });

    it("shows the venue and its city", () => {
      expect(headerFor(final).venueLabel).toBe(
        "crypto.com Arena · Los Angeles",
      );
      expect(headerFor(preGame).venueLabel).toBe(
        "Mortgage Matchup Center · Phoenix",
      );
    });

    it("shows the venue alone when ESPN has no city, and nothing without a venue", () => {
      expect(headerFor({ ...final, venueCity: null }).venueLabel).toBe(
        "crypto.com Arena",
      );
      expect(
        headerFor(withGame({ ...final, venueCity: null }, { venue: null }))
          .venueLabel,
      ).toBeNull();
    });
  });

  describe("status label", () => {
    it("shows the local tip-off time before the game", () => {
      expect(headerFor(preGame, "America/New_York").statusLabel).toBe(
        "10:00 PM",
      );
      expect(headerFor(preGame, "America/Los_Angeles").statusLabel).toBe(
        "7:00 PM",
      );
    });

    it("leaves the tip-off time out until the browser timezone is known", () => {
      expect(headerFor(preGame, null).statusLabel).toBeNull();
    });

    it("adds the weekday when the tip-off falls on another local day", () => {
      expect(headerFor(preGame, "Asia/Tokyo").statusLabel).toBe("Sun 11:00 AM");
    });

    it("shows the period and clock of a live game", () => {
      expect(headerFor(live).statusLabel).toBe("Q3 4:10");
    });

    it("shows halftime", () => {
      const halftime = withGame(live, {
        status: { kind: "halftime", period: 2 },
      });

      expect(headerFor(halftime).statusLabel).toBe("Halftime");
    });

    it("shows overtime periods of a live game", () => {
      const firstOvertime = withGame(live, {
        status: { kind: "live", period: 5, clock: "2:31" },
      });
      const secondOvertime = withGame(live, {
        status: { kind: "live", period: 6, clock: "0:48" },
      });

      expect(headerFor(firstOvertime).statusLabel).toBe("OT 2:31");
      expect(headerFor(secondOvertime).statusLabel).toBe("2OT 0:48");
    });

    it("shows final, and the overtime a final game went to", () => {
      expect(headerFor(final).statusLabel).toBe("Final");
      expect(headerFor(overtimePlayoff).statusLabel).toBe("Final/OT");
      expect(headerFor(doubleOvertimePlayoff).statusLabel).toBe("Final/2OT");
    });

    it("marks a postponed or canceled game", () => {
      const postponed = screenFor(
        withGame(preGame, { status: { kind: "postponed" } }),
      );
      const canceled = screenFor(
        withGame(preGame, { status: { kind: "canceled" } }),
      );

      expect(headerOf(postponed).statusLabel).toBe("Postponed");
      expect(postponed).toMatchObject({ note: strings.game.postponedNote });
      expect(headerOf(canceled).statusLabel).toBe("Canceled");
      expect(canceled).toMatchObject({ note: strings.game.canceledNote });
    });
  });

  describe("channel label", () => {
    it("shows the channel", () => {
      expect(headerFor(final).channelLabel).toBe("ESPN");
    });

    it("shows NBA League Pass when ESPN lists no supported channel", () => {
      expect(headerFor(preGame).channelLabel).toBe("NBA League Pass");
    });

    it("joins several channels", () => {
      const twoChannels = withGame(final, {
        broadcasts: [
          { name: "ESPN", market: "national" },
          { name: "Prime Video", market: "national" },
        ],
      });

      expect(headerFor(twoChannels).channelLabel).toBe("ESPN · Prime Video");
    });
  });

  describe("series status", () => {
    it("shows the leading team and the series score on a playoff game", () => {
      expect(headerFor(live).seriesLabel).toBe("LAL leads 2-0");
      expect(headerFor(doubleOvertimePlayoff).seriesLabel).toBe("SA leads 1-0");
      expect(headerFor(overtimePlayoff).seriesLabel).toBe("LAL leads 3-0");
    });

    it("shows a tied series and a won series", () => {
      const { series } = doubleOvertimePlayoff.game;
      if (!series) throw new Error("Expected a playoff series");

      const tied = withGame(doubleOvertimePlayoff, {
        series: { ...series, homeWins: 3, awayWins: 3 },
      });
      const won = withGame(doubleOvertimePlayoff, {
        series: { ...series, homeWins: 4, awayWins: 3, completed: true },
      });

      expect(headerFor(tied).seriesLabel).toBe("Series tied 3-3");
      expect(headerFor(won).seriesLabel).toBe("OKC wins 4-3");
    });

    it("shows no series status outside the playoffs", () => {
      expect(headerFor(final).seriesLabel).toBeNull();
    });
  });

  describe("line score", () => {
    it("shows one column per regulation period with each team's total", () => {
      expect(lineScoreFor(final)).toEqual({
        periodLabels: ["Q1", "Q2", "Q3", "Q4"],
        rows: [
          {
            side: "away",
            abbreviation: "GS",
            periodScores: [33, 19, 16, 37],
            total: 105,
            isLeading: false,
            isDimmed: true,
          },
          {
            side: "home",
            abbreviation: "LAL",
            periodScores: [34, 32, 36, 25],
            total: 127,
            isLeading: true,
            isDimmed: false,
          },
        ],
      });
    });

    it("adds an OT column for a game that went to overtime", () => {
      const lineScore = lineScoreFor(overtimePlayoff);

      expect(lineScore.periodLabels).toEqual(["Q1", "Q2", "Q3", "Q4", "OT"]);
      expect(lineScore.rows).toEqual([
        {
          side: "away",
          abbreviation: "LAL",
          periodScores: [39, 24, 17, 21, 11],
          total: 112,
          isLeading: true,
          isDimmed: false,
        },
        {
          side: "home",
          abbreviation: "HOU",
          periodScores: [32, 20, 23, 26, 7],
          total: 108,
          isLeading: false,
          isDimmed: true,
        },
      ]);
    });

    it("numbers each overtime after the first", () => {
      const lineScore = lineScoreFor(doubleOvertimePlayoff);

      expect(lineScore.periodLabels).toEqual([
        "Q1",
        "Q2",
        "Q3",
        "Q4",
        "OT",
        "2OT",
      ]);
      expect(lineScore.rows.map(({ periodScores }) => periodScores)).toEqual([
        [27, 24, 29, 21, 7, 14],
        [27, 17, 29, 28, 7, 7],
      ]);
    });

    it("keeps all regulation columns during a live game, leaving unplayed periods empty", () => {
      expect(lineScoreFor(live)).toEqual({
        periodLabels: ["Q1", "Q2", "Q3", "Q4"],
        rows: [
          {
            side: "away",
            abbreviation: "LAL",
            periodScores: [39, 24, 7, null],
            total: 70,
            isLeading: true,
            isDimmed: false,
          },
          {
            side: "home",
            abbreviation: "HOU",
            periodScores: [32, 20, 14, null],
            total: 66,
            isLeading: false,
            isDimmed: false,
          },
        ],
      });
    });

    it("leaves out periods ESPN lists past the current one of a live game", () => {
      const lineScore = lineScoreFor(liveFirstQuarter);

      // ESPN listed this 1st quarter game under two periods; only the period played so far is shown.
      expect(lineScore.rows).toEqual([
        {
          side: "away",
          abbreviation: "CLE",
          periodScores: [0, null, null, null],
          total: 11,
          isLeading: true,
          isDimmed: false,
        },
        {
          side: "home",
          abbreviation: "PHI",
          periodScores: [0, null, null, null],
          total: 9,
          isLeading: false,
          isDimmed: false,
        },
      ]);
    });

    it("adds the overtime column as soon as a live game reaches it", () => {
      const inOvertime = withGame(overtimePlayoff, {
        status: { kind: "live", period: 5, clock: "3:10" },
      });

      expect(lineScoreFor(inOvertime).periodLabels).toEqual([
        "Q1",
        "Q2",
        "Q3",
        "Q4",
        "OT",
      ]);
    });
  });

  describe("pre-game", () => {
    it("shows the matchup, tip-off, channel, and venue with a note that the game details come at tip-off", () => {
      const screen = screenFor(preGame, "America/Los_Angeles");

      expect(screen).toMatchObject({
        kind: "pre-game",
        note: strings.game.preGameNote,
        header: {
          title: "Golden State Warriors at Phoenix Suns",
          statusLabel: "7:00 PM",
          channelLabel: "NBA League Pass",
          venueLabel: "Mortgage Matchup Center · Phoenix",
        },
      });
    });
  });

  describe("box score", () => {
    it("shows MIN, PTS, REB, AST, FG, 3PT, and +/- columns", () => {
      expect(boxScoreFor(final)?.columns).toEqual([
        { stat: "minutes", label: "MIN" },
        { stat: "points", label: "PTS" },
        { stat: "rebounds", label: "REB" },
        { stat: "assists", label: "AST" },
        { stat: "fieldGoals", label: "FG" },
        { stat: "threePointers", label: "3PT" },
        { stat: "plusMinus", label: "+/-" },
      ]);
    });

    it("lists the away team first, as the header reads", () => {
      const teams = boxScoreFor(final)?.teams ?? [];

      expect(teams.map(({ side, teamName }) => ({ side, teamName }))).toEqual([
        { side: "away", teamName: "Warriors" },
        { side: "home", teamName: "Lakers" },
      ]);
    });

    it("separates the starters from the bench, in ESPN's order", () => {
      const lakers = boxScoreFor(final)?.teams[1];

      expect(lakers?.starters.map(({ shortName }) => shortName)).toEqual([
        "Z. Williams",
        "W. Kessler",
        "M. Thybulle",
        "L. Doncic",
        "A. Reaves",
      ]);
      expect(lakers?.bench.map(({ shortName }) => shortName)).toEqual([
        "K. Looney",
        "S. Mamukelashvili",
        "J. LaRavia",
        "Q. Grimes",
        "B. James",
        "C. Manon",
        "J. Hardy",
      ]);
    });

    it("shows each player's number, name, position, and stat line", () => {
      const doncic = boxScoreFor(final)?.teams[1].starters[3];

      expect(doncic).toEqual({
        id: expect.any(String),
        jersey: "77",
        name: "Luka Doncic",
        shortName: "L. Doncic",
        position: "G",
        stats: {
          minutes: "30",
          points: "28",
          rebounds: "8",
          assists: "7",
          fieldGoals: "7-18",
          threePointers: "5-12",
          plusMinus: "+31",
        },
        plusMinusTone: "positive",
      });
    });

    it("marks a negative plus-minus", () => {
      const looney = boxScoreFor(final)?.teams[1].bench[0];

      expect(looney?.plusMinusTone).toBe("negative");
    });

    it("lists players who did not play apart, with their reason", () => {
      const lakers = boxScoreFor(final)?.teams[1];

      expect(lakers?.didNotPlay).toEqual([
        {
          id: expect.any(String),
          jersey: "2",
          name: "Jarred Vanderbilt",
          shortName: "J. Vanderbilt",
          position: "F",
          reason: strings.game.boxScore.didNotPlayReason("COACH'S DECISION"),
        },
      ]);
      expect(
        [...lakers!.starters, ...lakers!.bench].map(({ name }) => name),
      ).not.toContain("Jarred Vanderbilt");
    });

    it("keeps injured players who did not play with their injury", () => {
      const rockets = boxScoreFor(overtimePlayoff)?.teams[1];

      expect(rockets?.didNotPlay.map(({ reason }) => reason)).toEqual([
        strings.game.boxScore.didNotPlayReason("LEFT ANKLE SPRAIN"),
        strings.game.boxScore.didNotPlayReason("COACH'S DECISION"),
      ]);
    });

    it.each([
      ["a final game", finalSummary],
      ["an overtime playoff game", overtimePlayoffSummary],
      ["a double overtime playoff game", doubleOvertimePlayoffSummary],
    ])(
      "totals each team's points to its score and matches its team stats in %s",
      (_, fixture) => {
        const summary = summaryOf(fixture);

        for (const { side, totals } of boxScoreFor(summary)?.teams ?? []) {
          const { team, score } = summary.game[side];
          expect(totals).toMatchObject({
            points: String(score),
            rebounds: teamStatOf(fixture, team.id, "totalRebounds"),
            assists: teamStatOf(fixture, team.id, "assists"),
            fieldGoals: teamStatOf(
              fixture,
              team.id,
              "fieldGoalsMade-fieldGoalsAttempted",
            ),
            threePointers: teamStatOf(
              fixture,
              team.id,
              "threePointFieldGoalsMade-threePointFieldGoalsAttempted",
            ),
          });
        }
      },
    );

    it("lists the players who have not checked in yet during a live game, without calling it a coach's decision", () => {
      const view = boxScoreFor(liveFirstQuarter);
      const cavaliers = view?.teams[0];

      expect(view?.didNotPlayLabel).toBe(
        strings.game.boxScore.groups.yetToPlay,
      );
      expect(cavaliers?.starters).toHaveLength(5);
      expect(cavaliers?.didNotPlay.map(({ reason }) => reason)).toEqual(
        Array(7).fill(null),
      );
      expect(cavaliers?.totals?.points).toBe("11");
    });

    it("keeps an injury as the reason during a live game", () => {
      const [rockets] = liveWithInjury.boxScore.home.players.filter(
        ({ stats }) => !stats,
      );
      const rocketsView = boxScoreFor(liveWithInjury)?.teams[1];

      expect(rockets.didNotPlayReason).toBe("LEFT ANKLE SPRAIN");
      expect(rocketsView?.didNotPlay[0].reason).toBe(
        strings.game.boxScore.didNotPlayReason("LEFT ANKLE SPRAIN"),
      );
    });

    it("labels the players who did not play once the game is final", () => {
      expect(boxScoreFor(final)?.didNotPlayLabel).toBe(
        strings.game.boxScore.groups.didNotPlay,
      );
    });

    it("shows no box score before ESPN lists any player", () => {
      expect(
        boxScoreFor({
          ...live,
          boxScore: {
            home: { players: [], totals: null },
            away: { players: [], totals: null },
          },
        }),
      ).toBeNull();
    });

    it("shows no box score before the game", () => {
      expect(screenFor(preGame)).not.toHaveProperty("boxScore");
    });
  });

  describe("team stats", () => {
    it("pairs each team statistic, away first, with ESPN's values", () => {
      const rows = teamStatsFor(final)?.rows ?? [];

      expect(rows.map(({ label, away, home }) => [label, away, home])).toEqual([
        ["FG%", "41%", "57%"],
        ["3P%", "22%", "39%"],
        ["FT%", "78%", "89%"],
        ["Rebounds", "36", "43"],
        ["Assists", "25", "28"],
        ["Turnovers", "16", "18"],
        ["Steals", "15", "11"],
        ["Blocks", "2", "5"],
        ["Points in paint", "56", "66"],
        ["Fast break points", "17", "21"],
        ["Largest lead", "3", "35"],
      ]);
    });

    it("flags the higher value as the better side", () => {
      const rows = teamStatsFor(final)?.rows ?? [];
      const betterSideOf = (stat: string) =>
        rows.find((row) => row.stat === stat)?.betterSide;

      expect(betterSideOf("fieldGoalPercentage")).toBe("home");
      expect(betterSideOf("steals")).toBe("away");
      expect(betterSideOf("largestLead")).toBe("home");
    });

    it("flags the fewer turnovers as the better side", () => {
      const rows = teamStatsFor(final)?.rows ?? [];

      expect(rows.find(({ stat }) => stat === "turnovers")?.betterSide).toBe(
        "away",
      );
    });

    it("flags neither side on a tie", () => {
      const rows =
        teamStatsFor(
          withTeamStats(final, {
            away: { pointsInPaint: 48, turnovers: 12 },
            home: { pointsInPaint: 48, turnovers: 12 },
          }),
        )?.rows ?? [];
      const betterSideOf = (stat: string) =>
        rows.find((row) => row.stat === stat)?.betterSide;

      expect(betterSideOf("pointsInPaint")).toBeNull();
      expect(betterSideOf("turnovers")).toBeNull();
    });

    it("splits each bar by the teams' share of the pair", () => {
      const rows =
        teamStatsFor(
          withTeamStats(final, {
            away: { rebounds: 30, steals: 0 },
            home: { rebounds: 10, steals: 0 },
          }),
        )?.rows ?? [];
      const sharesOf = (stat: string) => {
        const row = rows.find((candidate) => candidate.stat === stat);
        return [row?.awayShare, row?.homeShare];
      };

      expect(sharesOf("rebounds")).toEqual([75, 25]);
      expect(sharesOf("steals")).toEqual([0, 0]);
    });

    it("heads the stats with each team's abbreviation and a readable team color", () => {
      const teamStats = teamStatsFor(final);

      expect(teamStats?.away).toEqual({
        abbreviation: "GS",
        color: expect.stringMatching(/^#[0-9a-f]{6}$/),
      });
      expect(teamStats?.home.abbreviation).toBe("LAL");
      expect(teamStats?.away.color).not.toBe(teamStats?.home.color);
    });

    it("shows no team stats until ESPN lists them for both teams", () => {
      expect(
        teamStatsFor({ ...live, teamStats: { home: null, away: null } }),
      ).toBeNull();
    });

    it("shows no team stats before the game", () => {
      expect(screenFor(preGame)).not.toHaveProperty("teamStats");
    });
  });

  describe("game leaders", () => {
    it("shows the game's points, rebounds, and assists leaders across both teams", () => {
      expect(leadersFor(final)?.leaders).toEqual([
        {
          stat: "points",
          label: "Points",
          value: "28",
          athletes: [
            {
              name: "L. Doncic",
              teamAbbreviation: "LAL",
              headshotUrl:
                "https://a.espncdn.com/i/headshots/nba/players/full/3945274.png",
            },
          ],
        },
        {
          stat: "rebounds",
          label: "Rebounds",
          value: "9",
          athletes: [
            {
              name: "W. Kessler",
              teamAbbreviation: "LAL",
              headshotUrl:
                "https://a.espncdn.com/i/headshots/nba/players/full/4433136.png",
            },
          ],
        },
        {
          stat: "assists",
          label: "Assists",
          value: "8",
          athletes: [
            {
              name: "D. Green",
              teamAbbreviation: "GS",
              headshotUrl:
                "https://a.espncdn.com/i/headshots/nba/players/full/6589.png",
            },
          ],
        },
      ]);
    });

    it("shows both players on a tie, away first, as the header reads", () => {
      const tiedPoints = {
        ...final,
        leaders: {
          ...final.leaders,
          home: final.leaders.home.map((gameLeader) =>
            gameLeader.stat === "points"
              ? {
                  ...gameLeader,
                  leader: {
                    ...gameLeader.leader,
                    value: 23,
                    displayValue: "23",
                  },
                }
              : gameLeader,
          ),
        },
      };

      expect(
        leadersFor(tiedPoints)?.leaders[0].athletes.map(
          ({ name, teamAbbreviation }) => [name, teamAbbreviation],
        ),
      ).toEqual([
        ["S. Curry", "GS"],
        ["L. Doncic", "LAL"],
      ]);
    });

    it("takes the only team's leader when the other has none in a category", () => {
      const leaders =
        leadersFor({
          ...final,
          leaders: {
            ...final.leaders,
            home: final.leaders.home.filter(({ stat }) => stat !== "points"),
          },
        })?.leaders ?? [];

      expect(leaders[0]).toMatchObject({
        value: "23",
        athletes: [{ name: "S. Curry", teamAbbreviation: "GS" }],
      });
    });

    it("leaves out a category neither team has a leader for", () => {
      const withoutAssists = (gameLeaders: GameSummary["leaders"]["home"]) =>
        gameLeaders.filter(({ stat }) => stat !== "assists");
      const leaders =
        leadersFor({
          ...final,
          leaders: {
            home: withoutAssists(final.leaders.home),
            away: withoutAssists(final.leaders.away),
          },
        })?.leaders ?? [];

      expect(leaders.map(({ stat }) => stat)).toEqual(["points", "rebounds"]);
    });

    it("shows no leaders until ESPN lists any", () => {
      expect(
        leadersFor({ ...live, leaders: { home: [], away: [] } }),
      ).toBeNull();
    });
  });

  describe("tabs", () => {
    it("lists the Summary, Box score, Team stats, and Plays tabs, each linking to its query string", () => {
      const { items } = tabsFor(final, null);
      const gamePath = `/game/${final.game.id}`;

      expect(items).toEqual([
        { id: "summary", label: "Summary", href: gamePath },
        { id: "box", label: "Box score", href: `${gamePath}?tab=box` },
        { id: "stats", label: "Team stats", href: `${gamePath}?tab=stats` },
        { id: "plays", label: "Plays", href: `${gamePath}?tab=plays` },
      ]);
    });

    it("selects Summary when the query string has no tab", () => {
      expect(tabsFor(live, null).selected).toBe("summary");
    });

    it.each(["box", "stats", "plays"])(
      "selects the %s tab from the query string",
      (tab) => {
        expect(tabsFor(live, tab).selected).toBe(tab);
      },
    );

    it("falls back to Summary for an unknown tab", () => {
      expect(tabsFor(final, "highlights").selected).toBe("summary");
    });
  });
});
