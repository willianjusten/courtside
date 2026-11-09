import { GET as getGameCounts } from "@/app/api/game-counts/route";
import { GET as getLeaders } from "@/app/api/leaders/route";
import { GET as getStandings } from "@/app/api/standings/route";
import { GET as getTeams } from "@/app/api/teams/route";
import { GET as getTeamDetail } from "@/app/api/teams/[teamId]/route";
import { GET as getTeamLeaders } from "@/app/api/teams/[teamId]/leaders/route";
import { GET as getTeamRoster } from "@/app/api/teams/[teamId]/roster/route";
import { GET as getTeamSchedules } from "@/app/api/teams/[teamId]/schedule/route";

type FetchStub = (
  url: string,
  init?: RequestInit,
) => Response | Promise<Response>;

const TEAM_ROUTE_PATTERN = /^\/api\/teams\/(\d+)(\/\w+)?$/;
const TEAM_ROUTE_HANDLERS = {
  "": getTeamDetail,
  "/schedule": getTeamSchedules,
  "/roster": getTeamRoster,
  "/leaders": getTeamLeaders,
};

function apiResponseFor(url: string) {
  const request = new Request(new URL(url, "http://localhost"));
  const { pathname } = new URL(request.url);
  if (pathname === "/api/leaders") return getLeaders();
  if (pathname === "/api/standings") return getStandings();
  if (pathname === "/api/teams") return getTeams();
  if (pathname === "/api/game-counts") return getGameCounts(request);
  const [, teamId, resource = ""] = pathname.match(TEAM_ROUTE_PATTERN) ?? [];
  const teamRouteHandler =
    TEAM_ROUTE_HANDLERS[resource as keyof typeof TEAM_ROUTE_HANDLERS];
  if (!teamId || !teamRouteHandler) throw new Error(`No route for ${url}`);
  return teamRouteHandler(request, { params: Promise.resolve({ teamId }) });
}

// A fetch stub that serves the app's /api routes through their real handlers, which in turn read ESPN through espnFetch.
export function withApiRoutes(espnFetch: FetchStub): FetchStub {
  return (url, init) =>
    url.startsWith("/api/") ? apiResponseFor(url) : espnFetch(url, init);
}
