import {
  ESPN_ENDPOINTS,
  ESPN_ORIGINS,
  fillPathTemplate,
  isConfiguredCorePath,
  type EspnEndpointName,
} from "./config";

export class EspnRequestError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
    readonly responseText: string,
  ) {
    super(`ESPN request failed with status ${status}: ${url}`);
    this.name = "EspnRequestError";
  }
}

// ESPN sometimes returns $ref links on its internal host, which is not reachable from outside.
const PRIVATE_CORE_HOST_PATTERN = /https?:\/\/sports\.core\.api\.espn\.pvt/g;

type EspnRequestOptions = {
  searchParams?: URLSearchParams;
  // Fills the endpoint path placeholders, e.g. { teamId: "13" } for /teams/{teamId}.
  pathParams?: Record<string, string>;
};

// Never through Next.js' Data Cache: on Vercel every write there bills as an ISR write, and ESPN's payloads are large.
// The server caches mapped results in memory instead (see lib/server/memory-cache.ts).
async function requestEspn<RawResponse>(url: string): Promise<RawResponse> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new EspnRequestError(url, response.status, responseText);
  }

  return JSON.parse(
    responseText.replace(PRIVATE_CORE_HOST_PATTERN, ESPN_ORIGINS.core),
  ) as RawResponse;
}

export function espnGet<RawResponse>(
  endpointName: EspnEndpointName,
  { searchParams, pathParams = {} }: EspnRequestOptions = {},
): Promise<RawResponse> {
  const { host, path } = ESPN_ENDPOINTS[endpointName];
  const query = searchParams && searchParams.size > 0 ? `?${searchParams}` : "";
  return requestEspn(
    `${ESPN_ORIGINS[host]}${fillPathTemplate(path, pathParams)}${query}`,
  );
}

// Follows a core API $ref link. Only refs to a configured core endpoint are followed, so a ref can never reach another host or API.
export function espnGetRef<RawResponse>(ref: string): Promise<RawResponse> {
  const refUrl = new URL(ref);
  if (
    refUrl.hostname !== new URL(ESPN_ORIGINS.core).hostname ||
    !isConfiguredCorePath(refUrl.pathname)
  ) {
    return Promise.reject(
      new Error(`ESPN $ref does not match a configured endpoint: ${ref}`),
    );
  }

  // Refs come over http and carry lang/region params; dropping them keeps the request canonical.
  return requestEspn(`${ESPN_ORIGINS.core}${refUrl.pathname}`);
}
