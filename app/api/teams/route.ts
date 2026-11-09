import { cachedJsonResponse } from "@/app/lib/server/json-route";
import { CACHE_SECONDS, loadTeams } from "@/app/lib/server/loaders";

export function GET() {
  return cachedJsonResponse(loadTeams, CACHE_SECONDS.teams, "the teams");
}
