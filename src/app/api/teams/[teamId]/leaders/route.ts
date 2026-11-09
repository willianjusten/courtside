import {
  cachedJsonResponse,
  notFoundResponse,
  TEAM_ID_PATTERN,
} from "@/lib/server/json-route";
import { CACHE_SECONDS, loadTeamLeaders } from "@/lib/server/loaders";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/teams/[teamId]/leaders">,
) {
  const { teamId } = await params;
  if (!TEAM_ID_PATTERN.test(teamId)) return notFoundResponse();

  return cachedJsonResponse(
    () => loadTeamLeaders(teamId),
    CACHE_SECONDS.teamLeaders,
    `the leaders of team ${teamId}`,
  );
}
