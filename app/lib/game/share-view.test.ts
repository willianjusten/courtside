import type { Game, Team } from "@/app/lib/domain/game";
import type { GameSummary } from "@/app/lib/domain/game-summary";
import doubleOvertimePlayoffSummary from "@/app/lib/espn/__fixtures__/summary-final-double-overtime-playoff.json";
import overtimePlayoffSummary from "@/app/lib/espn/__fixtures__/summary-final-overtime-playoff.json";
import finalSummary from "@/app/lib/espn/__fixtures__/summary-final.json";
import liveSummary from "@/app/lib/espn/__fixtures__/summary-live.json";
import preGameTonightSummary from "@/app/lib/espn/__fixtures__/summary-pre-game-tonight.json";
import preGameSummary from "@/app/lib/espn/__fixtures__/summary-pre-game.json";
import { mapGameSummary } from "@/app/lib/espn/mappers";
import type { RawSummary } from "@/app/lib/espn/raw-types";
import { readableTeamColors } from "@/app/lib/home/team-colors";
import {
  INDEFINITE_CACHE_SECONDS,
  SHORT_CACHE_SECONDS,
  shareViewOf,
  type FinalShareView,
  type ScheduledShareView,
} from "./share-view";

const summaryOf = (fixture: unknown) => mapGameSummary(fixture as RawSummary);

function expectFinalShareView(summary: GameSummary): FinalShareView {
  const shareView = shareViewOf(summary);
  if (shareView.variant !== "final") {
    throw new Error(`Expected a final share view, got ${shareView.variant}`);
  }
  return shareView;
}

const final = summaryOf(finalSummary);
const overtimePlayoff = summaryOf(overtimePlayoffSummary);
const doubleOvertimePlayoff = summaryOf(doubleOvertimePlayoffSummary);
const preGame = summaryOf(preGameSummary);
const preGameTonight = summaryOf(preGameTonightSummary);
const live = summaryOf(liveSummary);

function expectScheduledShareView(summary: GameSummary): ScheduledShareView {
  const shareView = shareViewOf(summary);
  if (shareView.variant !== "scheduled") {
    throw new Error(
      `Expected a scheduled share view, got ${shareView.variant}`,
    );
  }
  return shareView;
}

function withAwayTeam(summary: GameSummary, team: Partial<Team>): GameSummary {
  const { away } = summary.game;
  const game: Game = {
    ...summary.game,
    away: { ...away, team: { ...away.team, ...team } },
  };
  return { ...summary, game };
}

describe("shareViewOf", () => {
  describe("a final game", () => {
    it("shows both teams, away first, with the final score", () => {
      const shareView = expectFinalShareView(final);

      expect(shareView).toMatchObject({
        variant: "final",
        away: {
          abbreviation: "GS",
          displayName: "Golden State Warriors",
          logoUrl:
            "https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/gs.png",
        },
        home: { abbreviation: "LAL", displayName: "Los Angeles Lakers" },
        score: { away: 105, home: 127 },
        statusLabel: "Final",
      });
    });

    it("colors each team with its readable team color", () => {
      const { home, away } = final.game;
      const colors = readableTeamColors(home.team, away.team);

      expect(expectFinalShareView(final)).toMatchObject({
        away: { color: colors.away },
        home: { color: colors.home },
      });
    });

    it("names the winning side", () => {
      expect(expectFinalShareView(final).winningSide).toBe("home");
      expect(expectFinalShareView(overtimePlayoff).winningSide).toBe("away");
    });

    it("labels an overtime finish", () => {
      expect(expectFinalShareView(overtimePlayoff).statusLabel).toBe(
        "Final/OT",
      );
    });

    it("labels a double overtime finish", () => {
      expect(expectFinalShareView(doubleOvertimePlayoff).statusLabel).toBe(
        "Final/2OT",
      );
    });

    it("titles the page with the abbreviations, the score, and the status", () => {
      expect(expectFinalShareView(overtimePlayoff).title).toBe(
        "LAL 112-108 HOU · Final/OT",
      );
    });

    it("describes the result with the full team names", () => {
      expect(expectFinalShareView(final).description).toBe(
        "Golden State Warriors 105, Los Angeles Lakers 127 · Final",
      );
    });

    it("keeps the logo empty for a team ESPN has no logo for", () => {
      const shareView = expectFinalShareView(
        withAwayTeam(final, { logoUrl: null }),
      );

      expect(shareView?.away.logoUrl).toBeNull();
      expect(shareView?.away.abbreviation).toBe("GS");
    });

    it("is cached indefinitely, since a final result never changes", () => {
      expect(expectFinalShareView(final).cacheSeconds).toBe(
        INDEFINITE_CACHE_SECONDS,
      );
    });
  });

  describe("a scheduled game", () => {
    it("shows both teams, away first, with the game date", () => {
      expect(expectScheduledShareView(preGame)).toMatchObject({
        variant: "scheduled",
        away: { abbreviation: "DEN", displayName: "Denver Nuggets" },
        home: { abbreviation: "OKC", displayName: "Oklahoma City Thunder" },
        statusLabel: "22 October 2026",
      });
    });

    it("dates a late tip-off by its Eastern date, not the UTC one", () => {
      // Tips off at 02:00 UTC on 25 October, still the evening of the 24th in New York.
      expect(expectScheduledShareView(preGameTonight).statusLabel).toBe(
        "24 October 2026",
      );
    });

    it("has no score", () => {
      expect(expectScheduledShareView(preGame)).not.toHaveProperty("score");
    });

    it("titles the page with the matchup and the date", () => {
      expect(expectScheduledShareView(preGame).title).toBe(
        "DEN vs OKC · 22 October 2026",
      );
    });

    it("describes the matchup with the full team names and the date", () => {
      expect(expectScheduledShareView(preGame).description).toBe(
        "Denver Nuggets vs Oklahoma City Thunder · 22 October 2026",
      );
    });

    it("is cached briefly, so the preview catches up once the game starts", () => {
      expect(expectScheduledShareView(preGame).cacheSeconds).toBe(
        SHORT_CACHE_SECONDS,
      );
    });
  });

  describe("the fallback to the default preview", () => {
    it("covers a game whose status has no preview yet", () => {
      expect(shareViewOf(live).variant).toBe("fallback");
    });

    it("covers a game that could not be loaded", () => {
      expect(shareViewOf(null).variant).toBe("fallback");
    });

    it("is cached briefly, so a temporary failure does not stick", () => {
      expect(shareViewOf(null).cacheSeconds).toBe(SHORT_CACHE_SECONDS);
    });
  });
});
