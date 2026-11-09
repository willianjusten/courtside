import { cachedJsonResponse } from "@/lib/server/json-route";
import { CACHE_SECONDS, loadStandings } from "@/lib/server/loaders";

export function GET() {
  return cachedJsonResponse(
    loadStandings,
    CACHE_SECONDS.standings,
    "the standings",
  );
}
