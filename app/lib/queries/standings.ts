import { queryOptions } from "@tanstack/react-query";
import { fetchStandings } from "@/app/lib/espn";

// Standings move only when a game ends, so they are never polled; a visit after five minutes refetches them.
const STANDINGS_STALE_MILLISECONDS = 5 * 60 * 1000;

export function standingsQueryOptions() {
  return queryOptions({
    queryKey: ["standings"],
    queryFn: fetchStandings,
    staleTime: STANDINGS_STALE_MILLISECONDS,
  });
}
