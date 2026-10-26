import Standings from "@/app/components/Standings";
// Not in the @/app/lib/espn barrel: the leaders module is server-only and the barrel is also imported by client code.
import { fetchLeaders } from "@/app/lib/espn/leaders";
import { leadersQueryOptions } from "@/app/lib/queries/leaders";
import { standingsQueryOptions } from "@/app/lib/queries/standings";
import { getServerQueryClient, Hydrate } from "@/app/lib/query/server";

// Standings change after every game, so the page cannot be prerendered at build time.
export const dynamic = "force-dynamic";

export default function StandingsPage() {
  const queryClient = getServerQueryClient();
  // Not awaited: the page streams with its skeletons while ESPN answers, and the pending queries hydrate on the client.
  // A failed prefetch is left to the client, which fetches again; the leaders fail on their own, without the standings.
  void queryClient.prefetchQuery(standingsQueryOptions());
  // The server assembles the leaders itself instead of calling its own route handler.
  void queryClient.prefetchQuery({
    ...leadersQueryOptions(),
    queryFn: fetchLeaders,
  });

  return (
    <Hydrate>
      <section className="py-6 md:py-8">
        <Standings />
      </section>
    </Hydrate>
  );
}
