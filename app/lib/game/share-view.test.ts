import type { Game, Team } from "@/app/lib/domain/game";
import type { GameSummary } from "@/app/lib/domain/game-summary";
import doubleOvertimePlayoffSummary from "@/app/lib/espn/__fixtures__/summary-final-double-overtime-playoff.json";
import overtimePlayoffSummary from "@/app/lib/espn/__fixtures__/summary-final-overtime-playoff.json";
import finalSummary from "@/app/lib/espn/__fixtures__/summary-final.json";
import liveSimulatedSummary from "@/app/lib/espn/__fixtures__/summary-live-simulated.json";
import liveSummary from "@/app/lib/espn/__fixtures__/summary-live.json";
import preGameTonightSummary from "@/app/lib/espn/__fixtures__/summary-pre-game-tonight.json";
import preGameSummary from "@/app/lib/espn/__fixtures__/summary-pre-game.json";
import { readableTeamColors } from "@/app/lib/home/team-colors";
import {
  degradedImageCacheSeconds,
  INDEFINITE_CACHE_SECONDS,
  SHORT_CACHE_SECONDS,
} from "@/app/lib/share-image/share-image";
import { shareViewOf, type ShareView } from "./share-view";
import { summaryOf, withGame } from "./summary-test-helpers";

function expectShareView<Variant extends ShareView["variant"]>(
  summary: GameSummary,
  variant: Variant,
): Extract<ShareView, { variant: Variant }> {
  const shareView = shareViewOf(summary);
  if (shareView.variant !== variant) {
    throw new Error(
      `Expected a ${variant} share view, got ${shareView.variant}`,
    );
  }
  return shareView as Extract<ShareView, { variant: Variant }>;
}

const final = summaryOf(finalSummary);
const overtimePlayoff = summaryOf(overtimePlayoffSummary);
const doubleOvertimePlayoff = summaryOf(doubleOvertimePlayoffSummary);
const preGame = summaryOf(preGameSummary);
const preGameTonight = summaryOf(preGameTonightSummary);
const live = summaryOf(liveSummary);
const liveSimulated = summaryOf(liveSimulatedSummary);

const halftime = withGame(liveSimulated, {
  status: { kind: "halftime", period: 2 },
});

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
      const shareView = expectShareView(final, "final");

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

      expect(expectShareView(final, "final")).toMatchObject({
        away: { color: colors.away },
        home: { color: colors.home },
      });
    });

    it("names the winning side", () => {
      expect(expectShareView(final, "final").winningSide).toBe("home");
      expect(expectShareView(overtimePlayoff, "final").winningSide).toBe(
        "away",
      );
    });

    it("labels an overtime finish", () => {
      expect(expectShareView(overtimePlayoff, "final").statusLabel).toBe(
        "Final/OT",
      );
    });

    it("labels a double overtime finish", () => {
      expect(expectShareView(doubleOvertimePlayoff, "final").statusLabel).toBe(
        "Final/2OT",
      );
    });

    it("titles the page with the abbreviations, the score, and the status", () => {
      expect(expectShareView(overtimePlayoff, "final").title).toBe(
        "LAL 112-108 HOU · Final/OT",
      );
    });

    it("describes the result with the full team names", () => {
      expect(expectShareView(final, "final").description).toBe(
        "Golden State Warriors 105, Los Angeles Lakers 127 · Final",
      );
    });

    it("keeps the logo empty for a team ESPN has no logo for", () => {
      const shareView = expectShareView(
        withAwayTeam(final, { logoUrl: null }),
        "final",
      );

      expect(shareView?.away.logoUrl).toBeNull();
      expect(shareView?.away.abbreviation).toBe("GS");
    });

    it("is cached indefinitely, since a final result never changes", () => {
      expect(expectShareView(final, "final").cacheSeconds).toBe(
        INDEFINITE_CACHE_SECONDS,
      );
    });
  });

  describe("a scheduled game", () => {
    it("shows both teams, away first, with the game date", () => {
      expect(expectShareView(preGame, "scheduled")).toMatchObject({
        variant: "scheduled",
        away: { abbreviation: "DEN", displayName: "Denver Nuggets" },
        home: { abbreviation: "OKC", displayName: "Oklahoma City Thunder" },
        statusLabel: "22 October 2026",
      });
    });

    it("dates a late tip-off by its Eastern date, not the UTC one", () => {
      // Tips off at 02:00 UTC on 25 October, still the evening of the 24th in New York.
      expect(expectShareView(preGameTonight, "scheduled").statusLabel).toBe(
        "24 October 2026",
      );
    });

    it("has no score", () => {
      expect(expectShareView(preGame, "scheduled")).not.toHaveProperty("score");
    });

    it("titles the page with the matchup and the date", () => {
      expect(expectShareView(preGame, "scheduled").title).toBe(
        "DEN vs OKC · 22 October 2026",
      );
    });

    it("describes the matchup with the full team names and the date", () => {
      expect(expectShareView(preGame, "scheduled").description).toBe(
        "Denver Nuggets vs Oklahoma City Thunder · 22 October 2026",
      );
    });

    it("is cached briefly, so the preview catches up once the game starts", () => {
      expect(expectShareView(preGame, "scheduled").cacheSeconds).toBe(
        SHORT_CACHE_SECONDS,
      );
    });
  });

  describe("a game in progress", () => {
    it("shows both teams, away first, with a live label", () => {
      expect(expectShareView(live, "in-progress")).toMatchObject({
        variant: "in-progress",
        away: { abbreviation: "CLE", displayName: "Cleveland Cavaliers" },
        home: { abbreviation: "PHI", displayName: "Philadelphia 76ers" },
        statusLabel: "Live",
      });
    });

    it("treats halftime as part of the game", () => {
      expect(expectShareView(halftime, "in-progress").statusLabel).toBe("Live");
    });

    it.each([
      ["live", live],
      ["live late in the game", liveSimulated],
      ["at halftime", halftime],
    ])("never shows the score or clock when %s", (_, summary) => {
      const shareView = expectShareView(summary, "in-progress");
      const { away, home } = summary.game;
      const scoreAndClock = [String(away.score), String(home.score)];
      if (summary.game.status.kind === "live") {
        scoreAndClock.push(summary.game.status.clock);
      }

      expect(shareView).not.toHaveProperty("score");
      for (const shareText of [
        shareView.statusLabel,
        shareView.title,
        shareView.description,
      ]) {
        for (const leakedValue of scoreAndClock) {
          expect(shareText).not.toContain(leakedValue);
        }
      }
    });

    it("titles the page with the matchup and the live label", () => {
      expect(expectShareView(liveSimulated, "in-progress").title).toBe(
        "LAL vs HOU · Live",
      );
    });

    it("describes the matchup with the full team names", () => {
      expect(expectShareView(liveSimulated, "in-progress").description).toBe(
        "Los Angeles Lakers vs Houston Rockets · Live",
      );
    });

    it("is cached for about a game's length, so it catches up once the game ends", () => {
      expect(expectShareView(live, "in-progress").cacheSeconds).toBe(
        SHORT_CACHE_SECONDS,
      );
    });
  });

  describe.each([
    ["postponed", "Postponed", SHORT_CACHE_SECONDS],
    ["canceled", "Canceled", INDEFINITE_CACHE_SECONDS],
  ] as const)("a %s game", (statusKind, statusLabel, cacheSeconds) => {
    const summary = withGame(final, { status: { kind: statusKind } });

    it(`shows both teams, away first, with a ${statusLabel} label`, () => {
      expect(expectShareView(summary, statusKind)).toMatchObject({
        variant: statusKind,
        away: { abbreviation: "GS", displayName: "Golden State Warriors" },
        home: { abbreviation: "LAL", displayName: "Los Angeles Lakers" },
        statusLabel,
      });
    });

    it("titles the page with the matchup and the status", () => {
      expect(expectShareView(summary, statusKind).title).toBe(
        `GS vs LAL · ${statusLabel}`,
      );
    });

    it("describes the matchup with the full team names and the status", () => {
      expect(expectShareView(summary, statusKind).description).toBe(
        `Golden State Warriors vs Los Angeles Lakers · ${statusLabel}`,
      );
    });

    it("never shows the score", () => {
      const shareView = expectShareView(summary, statusKind);
      const { away, home } = summary.game;

      expect(shareView).not.toHaveProperty("score");
      for (const shareText of [shareView.title, shareView.description]) {
        expect(shareText).not.toContain(String(away.score));
        expect(shareText).not.toContain(String(home.score));
      }
    });

    it("is cached for its status", () => {
      expect(expectShareView(summary, statusKind).cacheSeconds).toBe(
        cacheSeconds,
      );
    });
  });

  describe("the fallback to the default preview", () => {
    it("covers a game that could not be loaded", () => {
      expect(shareViewOf(null).variant).toBe("fallback");
    });

    it("carries no title or description, so the page metadata stays generic", () => {
      expect(shareViewOf(null)).not.toHaveProperty("title");
      expect(shareViewOf(null)).not.toHaveProperty("description");
    });

    it("is cached briefly, so a temporary failure does not stick", () => {
      expect(shareViewOf(null).cacheSeconds).toBe(SHORT_CACHE_SECONDS);
    });
  });

  describe("the cache of a degraded image", () => {
    it("is short even for a final game, so a passing logo failure does not stick", () => {
      expect(degradedImageCacheSeconds(shareViewOf(final))).toBe(
        SHORT_CACHE_SECONDS,
      );
    });

    it("stays as it was for a preview already cached briefly", () => {
      expect(degradedImageCacheSeconds(shareViewOf(preGame))).toBe(
        SHORT_CACHE_SECONDS,
      );
    });
  });
});
