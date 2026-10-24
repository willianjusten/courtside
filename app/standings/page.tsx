import LeagueLeaders from "@/app/components/LeagueLeaders";
import Standings from "@/app/components/Standings";
// Not in the @/app/lib/espn barrel: the leaders module is server-only and the barrel is also imported by client code.
import { fetchLeaders } from "@/app/lib/espn/leaders";
import { standingsQueryOptions } from "@/app/lib/queries/standings";
import { getServerQueryClient, Hydrate } from "@/app/lib/query/server";

// Standings change after every game, so the page cannot be prerendered at build time.
export const dynamic = "force-dynamic";

export default async function StandingsPage() {
  const [, leaderCategories] = await Promise.all([
    // A failed prefetch is left to the client, which fetches the standings again.
    getServerQueryClient().prefetchQuery(standingsQueryOptions()),
    // Leaders are secondary, so a failure there must not take the standings down with it.
    fetchLeaders().catch((error: unknown) => {
      console.error("Failed to load league leaders", error);
      return null;
    }),
  ]);

  return (
    <Hydrate>
      <section className="py-6 md:py-8">
        <Standings
          sideColumn={<LeagueLeaders categories={leaderCategories} />}
        />
      </section>
    </Hydrate>
  );
}
