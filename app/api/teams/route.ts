import { cachedJsonResponse } from "@/lib/server/json-route";
import { CACHE_SECONDS, loadTeams } from "@/lib/server/loaders";

export function GET() {
  return cachedJsonResponse(loadTeams, CACHE_SECONDS.teams, "the teams");
}
