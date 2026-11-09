import { cachedJsonResponse } from "@/app/lib/server/json-route";
import { CACHE_SECONDS, loadStandings } from "@/app/lib/server/loaders";

export function GET() {
  return cachedJsonResponse(
    loadStandings,
    CACHE_SECONDS.standings,
    "the standings",
  );
}
