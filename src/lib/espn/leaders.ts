import "server-only";
import {
  GAME_LEADER_STATS,
  LEADER_STATS,
  type Leader,
  type LeaderCategory,
  type LeaderStat,
  type TeamLeaderCategory,
} from "@/types/leaders";
import type { ListedTeam } from "@/types/team";
import { REGULAR_SEASON_TYPE_ID, type EspnEndpointName } from "./config";
import { mapLeader } from "./mappers";
import type {
  RawCurrentSeason,
  RawLeader,
  RawLeaderAthlete,
  RawLeaderCategory,
  RawLeadersResponse,
} from "./raw-types";
import { fetchTeams } from "./teams";
import { espnGet, espnGetRef, EspnRequestError } from "./transport";

const LEADERS_PER_CATEGORY = 5;
// The team page shows each category's leader and two runners-up.
const TEAM_LEADERS_PER_CATEGORY = 3;
const NOT_FOUND_STATUS = 404;
const NO_STATS_MESSAGE = "No stats found.";
const TEAM_ID_IN_REF_PATTERN = /\/teams\/(\d+)/;

const CATEGORY_NAME_BY_STAT: Record<LeaderStat, string> = {
  points: "pointsPerGame",
  rebounds: "reboundsPerGame",
  assists: "assistsPerGame",
  steals: "stealsPerGame",
  blocks: "blocksPerGame",
  threesMade: "3PointsMadePerGame",
  fieldGoalPercentage: "fieldGoalPercentage",
  freeThrowPercentage: "FreeThrowPct",
};

async function fetchRegularSeasonLeaders(
  endpointName: Extract<EspnEndpointName, "leaders" | "teamLeaders">,
  pathParams: Record<string, string>,
  limit: number,
): Promise<RawLeadersResponse | null> {
  try {
    return await espnGet<RawLeadersResponse>(endpointName, {
      pathParams: { ...pathParams, seasonTypeId: REGULAR_SEASON_TYPE_ID },
      searchParams: new URLSearchParams({ limit: String(limit) }),
    });
  } catch (error) {
    // ESPN answers 404 "No stats found." until the first regular season game is played. Any other 404 is a real error.
    if (
      error instanceof EspnRequestError &&
      error.status === NOT_FOUND_STATUS &&
      error.responseText.includes(NO_STATS_MESSAGE)
    ) {
      return null;
    }
    throw error;
  }
}

function findRawCategory(
  rawLeaders: RawLeadersResponse,
  stat: LeaderStat,
): RawLeaderCategory {
  const categoryName = CATEGORY_NAME_BY_STAT[stat];
  const rawCategory = rawLeaders.categories?.find(
    (category) => category.name === categoryName,
  );

  // A missing category means ESPN changed its format, which must not read as a season without leaders.
  if (!rawCategory) {
    throw new Error(`ESPN leaders response has no ${categoryName} category`);
  }

  return rawCategory;
}

// Shares one request per athlete across categories, since a player can lead more than one.
function createAthleteResolver() {
  const athleteRequestsByRef = new Map<string, Promise<RawLeaderAthlete>>();

  return (ref: string) => {
    let athleteRequest = athleteRequestsByRef.get(ref);
    if (!athleteRequest) {
      athleteRequest = espnGetRef<RawLeaderAthlete>(ref);
      athleteRequestsByRef.set(ref, athleteRequest);
    }
    return athleteRequest;
  };
}

// The team comes from the teams list by the id in ESPN's ref, which saves one request per leader.
function teamOf(rawLeader: RawLeader, teamsById: Map<string, ListedTeam>) {
  const teamId = rawLeader.team?.$ref.match(TEAM_ID_IN_REF_PATTERN)?.[1];
  return (teamId && teamsById.get(teamId)) || null;
}

// A category fails on its own, so one unresolvable athlete never hides the other categories. Dropping just that athlete would shift the ranking.
async function resolveCategoryLeaders<CategoryLeader extends Leader>(
  stat: LeaderStat,
  topRawLeaders: RawLeader[],
  resolveAthlete: (ref: string) => Promise<RawLeaderAthlete>,
  toCategoryLeader: (leader: Leader, rawLeader: RawLeader) => CategoryLeader,
): Promise<CategoryLeader[] | null> {
  try {
    const athletes = await Promise.all(
      topRawLeaders.map((rawLeader) => resolveAthlete(rawLeader.athlete.$ref)),
    );
    return topRawLeaders.map((rawLeader, index) =>
      toCategoryLeader(mapLeader(rawLeader, athletes[index]), rawLeader),
    );
  } catch (error) {
    console.error(`Failed to resolve the ${stat} leaders`, error);
    return null;
  }
}

function topRawLeadersOf(
  rawLeaders: RawLeadersResponse,
  stat: LeaderStat,
  count: number,
) {
  return findRawCategory(rawLeaders, stat).leaders.slice(0, count);
}

// Regular season leaders of the current season in each category, with athletes and teams resolved. Server only, so the browser never follows ESPN's $ref links itself.
export async function fetchLeaders(): Promise<LeaderCategory[]> {
  const { year } = await espnGet<RawCurrentSeason>("currentSeason");
  const rawLeaders = await fetchRegularSeasonLeaders(
    "leaders",
    { seasonYear: String(year) },
    LEADERS_PER_CATEGORY,
  );

  if (!rawLeaders) {
    return LEADER_STATS.map((stat) => ({ stat, leaders: [] }));
  }

  const topRawCategories = LEADER_STATS.map((stat) => ({
    stat,
    topRawLeaders: topRawLeadersOf(rawLeaders, stat, LEADERS_PER_CATEGORY),
  }));
  const resolveAthlete = createAthleteResolver();
  // Teams only label the leaders, so a failed teams list leaves the leaders without them instead of failing every category.
  const teams = await fetchTeams().catch((error: unknown) => {
    console.error("Failed to load the teams of the league leaders", error);
    return [];
  });
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  return Promise.all(
    topRawCategories.map(async ({ stat, topRawLeaders }) => ({
      stat,
      leaders: await resolveCategoryLeaders(
        stat,
        topRawLeaders,
        resolveAthlete,
        (leader, rawLeader) => ({
          ...leader,
          team: teamOf(rawLeader, teamsById),
        }),
      ),
    })),
  );
}

// The team's regular season leaders of the current season in points, rebounds, and assists. Server only, like fetchLeaders.
export async function fetchTeamLeaders(
  teamId: string,
): Promise<TeamLeaderCategory[]> {
  const { year } = await espnGet<RawCurrentSeason>("currentSeason");
  const rawLeaders = await fetchRegularSeasonLeaders(
    "teamLeaders",
    { seasonYear: String(year), teamId },
    TEAM_LEADERS_PER_CATEGORY,
  );

  if (!rawLeaders) {
    return GAME_LEADER_STATS.map((stat) => ({ stat, leaders: [] }));
  }

  const topRawCategories = GAME_LEADER_STATS.map((stat) => ({
    stat,
    topRawLeaders: topRawLeadersOf(rawLeaders, stat, TEAM_LEADERS_PER_CATEGORY),
  }));
  const resolveAthlete = createAthleteResolver();

  return Promise.all(
    topRawCategories.map(async ({ stat, topRawLeaders }) => ({
      stat,
      leaders: await resolveCategoryLeaders(
        stat,
        topRawLeaders,
        resolveAthlete,
        (leader) => leader,
      ),
    })),
  );
}
