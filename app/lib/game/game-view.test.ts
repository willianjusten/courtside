import type { Game } from "@/app/lib/domain/game";
import type { GameSummary } from "@/app/lib/domain/game-summary";
import doubleOvertimePlayoffSummary from "@/app/lib/espn/__fixtures__/summary-final-double-overtime-playoff.json";
import overtimePlayoffSummary from "@/app/lib/espn/__fixtures__/summary-final-overtime-playoff.json";
import finalSummary from "@/app/lib/espn/__fixtures__/summary-final.json";
import liveSummary from "@/app/lib/espn/__fixtures__/summary-live.json";
import preGameSummary from "@/app/lib/espn/__fixtures__/summary-pre-game-tonight.json";
import { mapGameSummary } from "@/app/lib/espn/mappers";
import type { RawSummary } from "@/app/lib/espn/raw-types";
import { strings } from "@/app/lib/strings";
import {
  buildGameView,
  type GameHeader,
  type GameScreen,
  type GameSummaryQueryState,
  type LineScoreView,
} from "./game-view";

const summaryOf = (fixture: unknown) => mapGameSummary(fixture as RawSummary);

const final = summaryOf(finalSummary);
const live = summaryOf(liveSummary);
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
  return buildGameView({ query: { status: "success", summary }, timeZone })
    .screen;
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

const headerFor = (summary: GameSummary, timeZone?: string | null) =>
  headerOf(screenFor(summary, timeZone));
const lineScoreFor = (summary: GameSummary) => lineScoreOf(screenFor(summary));

describe("buildGameView", () => {
  describe("screen states", () => {
    it("shows a loading state while the summary is pending", () => {
      expect(
        buildGameView({ query: { status: "loading" }, timeZone: null }),
      ).toEqual({ screen: { kind: "loading" }, staleNotice: null });
    });

    it("shows an error when the summary fails to load", () => {
      expect(
        buildGameView({ query: { status: "error" }, timeZone: null }),
      ).toEqual({ screen: { kind: "error" }, staleNotice: null });
    });

    it("shows the game without a stale notice once the summary loads", () => {
      const view = buildGameView({
        query: { status: "success", summary: final },
        timeZone: null,
      });

      expect(view.screen.kind).toBe("final");
      expect(view.staleNotice).toBeNull();
    });

    it("keeps the last game with a stale notice when a refetch fails", () => {
      const query: GameSummaryQueryState = { status: "stale", summary: live };

      const view = buildGameView({ query, timeZone: null });

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
      expect(away).toMatchObject({ score: 11, isLeading: true });
      expect(home).toMatchObject({
        score: 9,
        isLeading: false,
        isDimmed: false,
      });
    });

    it("emphasizes no side in a tied game", () => {
      const tied = withGame(live, {
        home: { ...live.game.home, score: 11 },
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
      expect(headerFor(live).statusLabel).toBe("Q1 6:44");
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
    it("shows the national channel", () => {
      expect(headerFor(final).channelLabel).toBe("ESPN");
    });

    it("shows NBA League Pass when ESPN lists no supported channel", () => {
      expect(headerFor(preGame).channelLabel).toBe("NBA League Pass");
    });

    it("joins several national channels", () => {
      const twoChannels = withGame(final, {
        broadcasts: [
          { name: "ESPN", market: "national" },
          { name: "Prime Video", market: "national" },
        ],
      });

      expect(headerFor(twoChannels).channelLabel).toBe("ESPN · Prime Video");
    });

    it("shows Local TV when the game has no national channel", () => {
      const localOnly = withGame(final, {
        broadcasts: [{ name: "ESPN", market: "home" }],
      });

      expect(headerFor(localOnly).channelLabel).toBe("Local TV");
    });
  });

  describe("series status", () => {
    it("shows the leading team and the series score on a playoff game", () => {
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
      const lineScore = lineScoreFor(live);

      expect(lineScore.periodLabels).toEqual(["Q1", "Q2", "Q3", "Q4"]);
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
});
