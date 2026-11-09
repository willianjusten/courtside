import { addDaysToNbaDate, parseNbaDate } from "@/app/lib/time/nba-date";
import {
  cachedJsonResponse,
  notFoundResponse,
} from "@/app/lib/server/json-route";
import { CACHE_SECONDS, loadGameCounts } from "@/app/lib/server/loaders";

// Wider than the date rail, narrow enough that a request can't make the server parse a whole season.
const MAX_RANGE_DAYS = 31;

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const firstDate = parseNbaDate(searchParams.get("from") ?? "");
  const lastDate = parseNbaDate(searchParams.get("to") ?? "");
  if (
    !firstDate ||
    !lastDate ||
    firstDate > lastDate ||
    // NbaDate strings are YYYY-MM-DD, so string order is calendar order.
    lastDate > addDaysToNbaDate(firstDate, MAX_RANGE_DAYS)
  ) {
    return notFoundResponse();
  }

  return cachedJsonResponse(
    () => loadGameCounts(firstDate, lastDate),
    CACHE_SECONDS.gameCounts,
    `the game counts from ${firstDate} to ${lastDate}`,
  );
}
