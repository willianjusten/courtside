import {
  cachedJsonResponse,
  notFoundResponse,
  TEAM_ID_PATTERN,
} from "@/lib/server/json-route";
import { CACHE_SECONDS, loadTeamDetail } from "@/lib/server/loaders";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/teams/[teamId]">,
) {
  const { teamId } = await params;
  if (!TEAM_ID_PATTERN.test(teamId)) return notFoundResponse();

  return cachedJsonResponse(
    () => loadTeamDetail(teamId),
    CACHE_SECONDS.teamDetail,
    `the team ${teamId}`,
  );
}
