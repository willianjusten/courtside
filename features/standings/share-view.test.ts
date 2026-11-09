import type { Standings } from "@/lib/domain/standings";
import standingsFixture from "@/lib/espn/__fixtures__/standings-regular-season.json";
import { mapConferenceStandings, mapSeason } from "@/lib/espn/mappers";
import type { RawStandingsResponse } from "@/lib/espn/raw-types";
import { readableTeamColor } from "@/lib/team-colors";
import { SHORT_CACHE_SECONDS } from "@/lib/share-image/share-image";
import {
  SEEDS_SHOWN,
  standingsShareViewOf,
  type ConferencesShareView,
  type StandingsShareView,
} from "./share-view";

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

const preseasonStandings: Standings = {
  season: { ...standings.season, currentPhase: "preseason" },
  conferences: standings.conferences.map((conference) => ({
    ...conference,
    rows: conference.rows.map((row) => ({ ...row, wins: 0, losses: 0 })),
  })),
};

function expectConferences(
  shareView: StandingsShareView,
): ConferencesShareView {
  if (shareView.variant !== "conferences") {
    throw new Error(
      `Expected a conferences share view, got ${shareView.variant}`,
    );
  }
  return shareView;
}

describe("standingsShareViewOf", () => {
  it("shows both conferences with the season", () => {
    const shareView = expectConferences(standingsShareViewOf(standings));

    expect(shareView.seasonLabel).toBe(
      `SEASON ${standings.season.displayName.replace("-", "–")}`,
    );
    expect(shareView.conferences.map(({ label }) => label)).toEqual([
      "East",
      "West",
    ]);
    expect(shareView.alt).toBe(`Standings · ${shareView.seasonLabel}`);
  });

  it("shows the top five seeds of each conference in seed order", () => {
    const shareView = expectConferences(standingsShareViewOf(standings));

    for (const conference of shareView.conferences) {
      expect(conference.rows.map(({ seed }) => seed)).toEqual(
        Array.from({ length: SEEDS_SHOWN }, (_, index) => index + 1),
      );
    }
  });

  it("shows each team's mark, abbreviation and record", () => {
    const shareView = expectConferences(standingsShareViewOf(standings));
    const [eastLeader] = standings.conferences[0].rows;

    expect(shareView.conferences[0].rows[0]).toEqual({
      seed: 1,
      team: {
        abbreviation: eastLeader.team.abbreviation,
        displayName: eastLeader.team.displayName,
        logoUrl: eastLeader.team.logoUrl,
        color: readableTeamColor(eastLeader.team),
      },
      record: `${eastLeader.wins}-${eastLeader.losses}`,
    });
  });

  it("keeps a team without a logo, for the image to draw its abbreviation", () => {
    const [east, west] = standings.conferences;
    const [eastLeader, ...otherRows] = east.rows;
    const withoutLogo: Standings = {
      ...standings,
      conferences: [
        {
          ...east,
          rows: [
            { ...eastLeader, team: { ...eastLeader.team, logoUrl: null } },
            ...otherRows,
          ],
        },
        west,
      ],
    };
    const shareView = expectConferences(standingsShareViewOf(withoutLogo));

    expect(shareView.conferences[0].rows[0].team).toMatchObject({
      abbreviation: eastLeader.team.abbreviation,
      logoUrl: null,
    });
  });

  it("is cached for three hours", () => {
    expect(standingsShareViewOf(standings).cacheSeconds).toBe(
      SHORT_CACHE_SECONDS,
    );
  });

  it("falls back to the default image before the regular season", () => {
    expect(standingsShareViewOf(preseasonStandings)).toEqual({
      variant: "fallback",
      cacheSeconds: SHORT_CACHE_SECONDS,
    });
  });

  it("falls back to the default image when the standings could not be loaded", () => {
    expect(standingsShareViewOf(null)).toEqual({
      variant: "fallback",
      cacheSeconds: SHORT_CACHE_SECONDS,
    });
  });
});
