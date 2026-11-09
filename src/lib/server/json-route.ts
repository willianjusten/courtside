import "server-only";
import { EspnRequestError } from "@/lib/espn/transport";

const NOT_FOUND_STATUS = 404;
const BAD_GATEWAY_STATUS = 502;
// ESPN answers 404 for an unknown resource and 400 for an id it cannot read.
const UNKNOWN_RESOURCE_STATUSES = new Set([400, 404]);

/**
 * Serves loaded data as JSON cached on Vercel's CDN. CDN cache reads and writes are free,
 * unlike the ISR and Data Cache, which bill every write in 8 KB units.
 * The browser keeps no HTTP copy; TanStack Query decides when to refetch.
 */
export async function cachedJsonResponse<Data>(
  load: () => Promise<Data>,
  cacheSeconds: number,
  failureLabel: string,
): Promise<Response> {
  try {
    return Response.json(await load(), {
      headers: {
        "cache-control": "public, max-age=0, must-revalidate",
        "cdn-cache-control": `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`,
      },
    });
  } catch (error) {
    const isUnknownResource =
      error instanceof EspnRequestError &&
      UNKNOWN_RESOURCE_STATUSES.has(error.status);
    if (!isUnknownResource)
      console.error(`Failed to load ${failureLabel}`, error);
    return new Response(null, {
      status: isUnknownResource ? NOT_FOUND_STATUS : BAD_GATEWAY_STATUS,
      headers: { "cache-control": "no-store" },
    });
  }
}

// ESPN team ids are numeric, so anything else never reaches ESPN.
export const TEAM_ID_PATTERN = /^\d+$/;

export function notFoundResponse() {
  return new Response(null, { status: NOT_FOUND_STATUS });
}
