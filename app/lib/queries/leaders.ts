import { queryOptions } from "@tanstack/react-query";
import type {
  LeaderCategory,
  TeamLeaderCategory,
} from "@/app/lib/domain/leaders";

// Matches the hour the server caches ESPN's leaders for, so the client never refetches a copy the server would repeat.
const LEADERS_STALE_MILLISECONDS = 60 * 60 * 1000;
export const LEADERS_API_PATH = "/api/leaders";

// The browser reads the leaders through the app's route handler, since assembling them follows ESPN $ref links on the server.
async function fetchLeadersFromApi(): Promise<LeaderCategory[]> {
  const response = await fetch(LEADERS_API_PATH);
  if (!response.ok) {
    throw new Error(`Leaders request failed with status ${response.status}`);
  }
  return response.json();
}

export function leadersQueryOptions() {
  return queryOptions({
    queryKey: ["leaders"],
    queryFn: fetchLeadersFromApi,
    staleTime: LEADERS_STALE_MILLISECONDS,
  });
}

export function teamLeadersApiPath(teamId: string) {
  return `/api/teams/${encodeURIComponent(teamId)}/leaders`;
}

async function fetchTeamLeadersFromApi(
  teamId: string,
): Promise<TeamLeaderCategory[]> {
  const response = await fetch(teamLeadersApiPath(teamId));
  if (!response.ok) {
    throw new Error(
      `Team leaders request failed with status ${response.status}`,
    );
  }
  return response.json();
}

export function teamLeadersQueryOptions(teamId: string) {
  return queryOptions({
    queryKey: ["team-leaders", teamId],
    queryFn: () => fetchTeamLeadersFromApi(teamId),
    staleTime: LEADERS_STALE_MILLISECONDS,
  });
}
