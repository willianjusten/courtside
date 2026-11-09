import { queryOptions } from "@tanstack/react-query";
import type { Standings } from "@/lib/domain/standings";
import { fetchApi } from "@/lib/query/fetch-api";

// Standings move only when a game ends, so they are never polled; a visit after five minutes refetches them.
const STANDINGS_STALE_MILLISECONDS = 5 * 60 * 1000;

export function standingsQueryOptions() {
  return queryOptions({
    queryKey: ["standings"],
    queryFn: () => fetchApi<Standings>("/api/standings"),
    staleTime: STANDINGS_STALE_MILLISECONDS,
  });
}
