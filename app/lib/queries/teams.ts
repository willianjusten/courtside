import { queryOptions } from "@tanstack/react-query";
import type { ListedTeam } from "@/app/lib/domain/team";
import { fetchApi } from "@/app/lib/api/fetch-api";

// The teams list changes at most between seasons, so it is cached for a day and never polled.
const TEAMS_STALE_MILLISECONDS = 24 * 60 * 60 * 1000;

export function teamsQueryOptions() {
  return queryOptions({
    queryKey: ["teams"],
    queryFn: () => fetchApi<ListedTeam[]>("/api/teams"),
    staleTime: TEAMS_STALE_MILLISECONDS,
  });
}
