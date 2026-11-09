import { queryOptions } from "@tanstack/react-query";
import type { LeaderCategory, TeamLeaderCategory } from "@/types/leaders";
import { fetchApi } from "@/lib/react-query/fetch-api";

// Matches the hour the server caches the leaders for.
const LEADERS_STALE_MILLISECONDS = 60 * 60 * 1000;

export function leadersQueryOptions() {
  return queryOptions({
    queryKey: ["leaders"],
    queryFn: () => fetchApi<LeaderCategory[]>("/api/leaders"),
    staleTime: LEADERS_STALE_MILLISECONDS,
  });
}

export function teamLeadersQueryOptions(teamId: string) {
  return queryOptions({
    queryKey: ["team-leaders", teamId],
    queryFn: () =>
      fetchApi<TeamLeaderCategory[]>(
        `/api/teams/${encodeURIComponent(teamId)}/leaders`,
      ),
    staleTime: LEADERS_STALE_MILLISECONDS,
  });
}
