// Not in the @/app/lib/espn barrel: the leaders module is server-only and the barrel is also imported by client code.
import { fetchTeamLeaders } from "@/app/lib/espn/leaders";

const BAD_REQUEST_STATUS = 400;
const BAD_GATEWAY_STATUS = 502;
// ESPN team ids are numeric, so anything else never reaches ESPN.
const TEAM_ID_PATTERN = /^\d+$/;

// The leaders come from ESPN at request time, so the route cannot be prerendered at build time.
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ teamId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { teamId } = await params;
  if (!TEAM_ID_PATTERN.test(teamId)) {
    return new Response(null, { status: BAD_REQUEST_STATUS });
  }

  try {
    return Response.json(await fetchTeamLeaders(teamId));
  } catch (error) {
    console.error(`Failed to load the leaders of team ${teamId}`, error);
    return new Response(null, { status: BAD_GATEWAY_STATUS });
  }
}
