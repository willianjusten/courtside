import type { Scoreboard } from "@/app/lib/domain/game";
import type { NbaDate } from "@/app/lib/domain/nba-date";
import finalDay from "@/app/lib/espn/__fixtures__/scoreboard-final-day.json";
import liveDay from "@/app/lib/espn/__fixtures__/scoreboard-live-day-simulated.json";
import scheduledDay from "@/app/lib/espn/__fixtures__/scoreboard-scheduled-day.json";
import { mapGame } from "@/app/lib/espn/mappers";
import type { RawEvent } from "@/app/lib/espn/raw-types";
import { SHORT_CACHE_SECONDS } from "@/app/lib/share-image/share-image";
import {
  homeShareViewOf,
  SLATE_MATCHUPS_SHOWN,
  type HomeShareView,
  type SlateShareView,
} from "./share-view";
import { readableTeamColors } from "./team-colors";

const nbaDate = "2026-10-20" as NbaDate;

const gamesOf = (fixture: { events: unknown[] }) =>
  fixture.events.map((event) => mapGame(event as RawEvent));

const [scheduledGame, secondScheduledGame] = gamesOf(scheduledDay);
const dayGames = [...gamesOf(scheduledDay), ...gamesOf(liveDay)];
// Seven games, one more than the slate shows.
const fullDayGames = [...dayGames, ...gamesOf(finalDay)];

const scoreboardOf = (games = dayGames): Scoreboard => ({ nbaDate, games });

function expectSlate(shareView: HomeShareView): SlateShareView {
  if (shareView.variant !== "slate") {
    throw new Error(`Expected a slate share view, got ${shareView.variant}`);
  }
  return shareView;
}

describe("homeShareViewOf", () => {
  it("shows the day's date and game count", () => {
    const shareView = expectSlate(homeShareViewOf(scoreboardOf()));

    expect(shareView).toMatchObject({
      dateLabel: "20 October 2026",
      gamesLabel: "4 games",
      moreLabel: null,
      alt: "4 games · 20 October 2026",
    });
  });

  it("counts a single game in the singular", () => {
    const shareView = expectSlate(
      homeShareViewOf(scoreboardOf([scheduledGame])),
    );

    expect(shareView.gamesLabel).toBe("1 game");
  });

  it("lists each matchup away first, with readable team colors", () => {
    const shareView = expectSlate(homeShareViewOf(scoreboardOf()));
    const colors = readableTeamColors(
      secondScheduledGame.home.team,
      secondScheduledGame.away.team,
    );

    expect(shareView.matchups).toHaveLength(dayGames.length);
    expect(shareView.matchups[1]).toEqual({
      away: {
        abbreviation: secondScheduledGame.away.team.abbreviation,
        displayName: secondScheduledGame.away.team.displayName,
        logoUrl: secondScheduledGame.away.team.logoUrl,
        color: colors.away,
      },
      home: {
        abbreviation: secondScheduledGame.home.team.abbreviation,
        displayName: secondScheduledGame.home.team.displayName,
        logoUrl: secondScheduledGame.home.team.logoUrl,
        color: colors.home,
      },
    });
  });

  it("shows the first six matchups and counts the rest", () => {
    const shareView = expectSlate(homeShareViewOf(scoreboardOf(fullDayGames)));

    expect(shareView.gamesLabel).toBe("7 games");
    expect(shareView.matchups).toHaveLength(SLATE_MATCHUPS_SHOWN);
    expect(shareView.moreLabel).toBe("+1 more");
  });

  it("keeps a team without a logo, for the image to draw its abbreviation", () => {
    const withoutLogo = {
      ...scheduledGame,
      away: {
        ...scheduledGame.away,
        team: { ...scheduledGame.away.team, logoUrl: null },
      },
    };
    const shareView = expectSlate(homeShareViewOf(scoreboardOf([withoutLogo])));

    expect(shareView.matchups[0].away).toMatchObject({
      abbreviation: scheduledGame.away.team.abbreviation,
      logoUrl: null,
    });
  });

  it("never carries a score", () => {
    const shareView = homeShareViewOf(scoreboardOf(fullDayGames));

    expect(JSON.stringify(shareView)).not.toMatch(/"score"/);
  });

  it("is cached for three hours", () => {
    expect(homeShareViewOf(scoreboardOf()).cacheSeconds).toBe(
      SHORT_CACHE_SECONDS,
    );
  });

  it("falls back to the default image on a day without games", () => {
    expect(homeShareViewOf(scoreboardOf([]))).toEqual({
      variant: "fallback",
      cacheSeconds: SHORT_CACHE_SECONDS,
    });
  });

  it("falls back to the default image when the scoreboard could not be loaded", () => {
    expect(homeShareViewOf(null)).toEqual({
      variant: "fallback",
      cacheSeconds: SHORT_CACHE_SECONDS,
    });
  });
});
