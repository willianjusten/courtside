// Not in the @/app/lib/espn barrel: the leaders module is server-only and the barrel is also imported by client code.
import { fetchLeaders } from "@/app/lib/espn/leaders";

const BAD_GATEWAY_STATUS = 502;

// The leaders come from ESPN at request time, so the route cannot be prerendered at build time.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await fetchLeaders());
  } catch (error) {
    console.error("Failed to load league leaders", error);
    return new Response(null, { status: BAD_GATEWAY_STATUS });
  }
}
