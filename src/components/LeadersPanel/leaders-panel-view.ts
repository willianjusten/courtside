import {
  GAME_LEADER_STATS,
  type GameLeaderStat,
  type Leader,
  type LeaderCategory,
  type LeaderStat,
  type TeamLeaderCategory,
} from "@/types/leaders";

const RUNNERS_UP_COUNT = 2;
// The leader holds rank 1.
const FIRST_RUNNER_UP_RANK = 2;

export type LeadersPanelRunnerUp = {
  rank: number;
  shortName: string;
  displayValue: string;
};

export type LeadersPanelCategory =
  | {
      status: "ready";
      stat: GameLeaderStat;
      leader: Leader;
      runnersUp: LeadersPanelRunnerUp[];
    }
  | { status: "empty" | "error"; stat: GameLeaderStat };

function isPanelStat(stat: LeaderStat): stat is GameLeaderStat {
  return (GAME_LEADER_STATS as LeaderStat[]).includes(stat);
}

// Builds the home sidebar leaders and the team page leaders, whose categories hold the team's own players.
export function buildLeadersPanelCategories(
  categories: (LeaderCategory | TeamLeaderCategory)[],
): LeadersPanelCategory[] {
  return categories.flatMap(({ stat, leaders }): LeadersPanelCategory | [] => {
    if (!isPanelStat(stat)) return [];
    if (leaders === null) return { status: "error", stat };
    const [leader, ...rest] = leaders;
    if (!leader) return { status: "empty", stat };

    return {
      status: "ready",
      stat,
      leader,
      runnersUp: rest
        .slice(0, RUNNERS_UP_COUNT)
        .map(({ athlete, displayValue }, index) => ({
          rank: FIRST_RUNNER_UP_RANK + index,
          shortName: athlete.shortName,
          displayValue,
        })),
    };
  });
}
