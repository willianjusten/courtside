import {
  cachedJsonResponse,
  notFoundResponse,
  TEAM_ID_PATTERN,
} from "@/lib/server/json-route";
import { CACHE_SECONDS, loadTeamRoster } from "@/lib/server/loaders";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/teams/[teamId]/roster">,
) {
  const { teamId } = await params;
  if (!TEAM_ID_PATTERN.test(teamId)) return notFoundResponse();

  return cachedJsonResponse(
    () => loadTeamRoster(teamId),
    CACHE_SECONDS.teamRoster,
    `the roster of team ${teamId}`,
  );
}
