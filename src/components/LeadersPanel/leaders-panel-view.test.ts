import type { LeaderCategory, LeagueLeader } from "@/types/leaders";
import { buildLeadersPanelCategories } from "./leaders-panel-view";

function leaderNamed(name: string, displayValue: string): LeagueLeader {
  const [firstName, ...lastNames] = name.split(" ");
  return {
    athlete: {
      id: name,
      displayName: name,
      shortName: `${firstName[0]}. ${lastNames.join(" ")}`,
      headshotUrl: `https://a.espncdn.com/${name}.png`,
    },
    team: null,
    value: Number(displayValue),
    displayValue,
  };
}

const pointsLeaders = [
  leaderNamed("Shai Gilgeous-Alexander", "33.5"),
  leaderNamed("Luka Doncic", "31.8"),
  leaderNamed("Giannis Antetokounmpo", "30.2"),
  leaderNamed("Anthony Edwards", "28.9"),
];

describe("buildLeadersPanelCategories", () => {
  it("keeps each category's leader and the next two runners-up", () => {
    const categories: LeaderCategory[] = [
      { stat: "points", leaders: pointsLeaders },
    ];

    const [points] = buildLeadersPanelCategories(categories);

    expect(points).toEqual({
      status: "ready",
      stat: "points",
      leader: pointsLeaders[0],
      runnersUp: [
        { rank: 2, shortName: "L. Doncic", displayValue: "31.8" },
        { rank: 3, shortName: "G. Antetokounmpo", displayValue: "30.2" },
      ],
    });
  });

  it("keeps a category with fewer than three leaders", () => {
    const [points] = buildLeadersPanelCategories([
      { stat: "points", leaders: pointsLeaders.slice(0, 1) },
    ]);

    expect(points).toMatchObject({ status: "ready", runnersUp: [] });
  });

  it("shows only the points, rebounds, and assists categories", () => {
    const categories: LeaderCategory[] = [
      "points",
      "rebounds",
      "assists",
      "steals",
      "blocks",
      "threesMade",
      "fieldGoalPercentage",
      "freeThrowPercentage",
    ].map((stat) => ({
      stat: stat as LeaderCategory["stat"],
      leaders: pointsLeaders,
    }));

    expect(
      buildLeadersPanelCategories(categories).map(({ stat }) => stat),
    ).toEqual(["points", "rebounds", "assists"]);
  });

  it("marks categories without leaders as empty and failed ones as errors", () => {
    expect(
      buildLeadersPanelCategories([
        { stat: "rebounds", leaders: [] },
        { stat: "assists", leaders: null },
      ]),
    ).toEqual([
      { status: "empty", stat: "rebounds" },
      { status: "error", stat: "assists" },
    ]);
  });
});
