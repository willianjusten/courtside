import {
  cachedJsonResponse,
  notFoundResponse,
  TEAM_ID_PATTERN,
} from "@/app/lib/server/json-route";
import { CACHE_SECONDS, loadTeamSchedules } from "@/app/lib/server/loaders";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/teams/[teamId]/schedule">,
) {
  const { teamId } = await params;
  if (!TEAM_ID_PATTERN.test(teamId)) return notFoundResponse();

  return cachedJsonResponse(
    () => loadTeamSchedules(teamId),
    CACHE_SECONDS.teamSchedules,
    `the schedule of team ${teamId}`,
  );
}
