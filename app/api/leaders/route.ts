import { cachedJsonResponse } from "@/app/lib/server/json-route";
import { CACHE_SECONDS, loadLeaders } from "@/app/lib/server/loaders";

export function GET() {
  return cachedJsonResponse(
    loadLeaders,
    CACHE_SECONDS.leaders,
    "the league leaders",
  );
}
