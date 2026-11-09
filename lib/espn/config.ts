export const ESPN_ORIGINS = {
  site: "https://site.api.espn.com",
  siteWeb: "https://site.web.api.espn.com",
  core: "https://sports.core.api.espn.com",
} as const;

export type EspnHost = keyof typeof ESPN_ORIGINS;

export type EspnEndpoint = {
  host: EspnHost;
  // May contain {placeholders}, filled from the request's path params.
  path: string;
};

export const REGULAR_SEASON_TYPE_ID = "2";
export const POSTSEASON_TYPE_ID = "3";

const TEAMS_PATH = "/apis/site/v2/sports/basketball/nba/teams";
const CORE_NBA_PATH = "/v2/sports/basketball/leagues/nba";

// Only the scoreboard and summary (live, polled) and the season calendar (small) are read by the browser.
// Every other endpoint is read on the server and served to the browser mapped, through an /api route.
export const ESPN_ENDPOINTS = {
  scoreboard: {
    host: "site",
    path: "/apis/site/v2/sports/basketball/nba/scoreboard",
  },
  // The site scoreboard rejects date ranges, but the header scoreboard serves a whole range in one response.
  scoreboardHeader: { host: "siteWeb", path: "/apis/v2/scoreboard/header" },
  summary: {
    host: "site",
    path: "/apis/site/v2/sports/basketball/nba/summary",
  },
  teams: { host: "site", path: TEAMS_PATH },
  team: { host: "site", path: `${TEAMS_PATH}/{teamId}` },
  teamSchedule: { host: "site", path: `${TEAMS_PATH}/{teamId}/schedule` },
  teamRoster: { host: "site", path: `${TEAMS_PATH}/{teamId}/roster` },
  standings: { host: "site", path: "/apis/v2/sports/basketball/nba/standings" },
  // The team's injury reports, each a $ref to the report that explains it.
  teamInjuries: {
    host: "core",
    path: `${CORE_NBA_PATH}/teams/{teamId}/injuries`,
  },
  injury: {
    host: "core",
    path: `${CORE_NBA_PATH}/seasons/{seasonYear}/athletes/{athleteId}/injuries/{injuryId}`,
  },
  currentSeason: { host: "core", path: `${CORE_NBA_PATH}/season` },
  leaders: {
    host: "core",
    path: `${CORE_NBA_PATH}/seasons/{seasonYear}/types/{seasonTypeId}/leaders`,
  },
  teamLeaders: {
    host: "core",
    path: `${CORE_NBA_PATH}/seasons/{seasonYear}/types/{seasonTypeId}/teams/{teamId}/leaders`,
  },
  seasonAthlete: {
    host: "core",
    path: `${CORE_NBA_PATH}/seasons/{seasonYear}/athletes/{athleteId}`,
  },
} satisfies Record<string, EspnEndpoint>;

export type EspnEndpointName = keyof typeof ESPN_ENDPOINTS;

const PATH_PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

export function fillPathTemplate(
  pathTemplate: string,
  pathParams: Record<string, string>,
) {
  return pathTemplate.replaceAll(PATH_PLACEHOLDER_PATTERN, (_match, name) => {
    const value = pathParams[name];
    if (value === undefined) {
      throw new Error(`Missing ESPN path param "${name}" for ${pathTemplate}`);
    }
    return encodeURIComponent(value);
  });
}

// Exact template match, so a $ref can only reach a configured endpoint.
export function isConfiguredCorePath(pathname: string) {
  return Object.values<EspnEndpoint>(ESPN_ENDPOINTS).some(
    (endpoint) =>
      endpoint.host === "core" &&
      new RegExp(
        `^${endpoint.path.replaceAll(PATH_PLACEHOLDER_PATTERN, "[^/]+")}$`,
      ).test(pathname),
  );
}
