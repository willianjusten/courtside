import { queryOptions } from "@tanstack/react-query";
import type { LeaderCategory } from "@/app/lib/domain/leaders";
import { fetchApi } from "@/app/lib/api/fetch-api";

// Matches the hour the server caches the leaders for.
export const LEADERS_STALE_MILLISECONDS = 60 * 60 * 1000;

export function leadersQueryOptions() {
  return queryOptions({
    queryKey: ["leaders"],
    queryFn: () => fetchApi<LeaderCategory[]>("/api/leaders"),
    staleTime: LEADERS_STALE_MILLISECONDS,
  });
}
