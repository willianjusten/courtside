import Standings from "@/app/components/Standings";
import { getServerQueryClient, Hydrate } from "@/app/lib/query/server";
import { serverQueries } from "@/app/lib/query/server-queries";

export const dynamic = "force-dynamic";

export default function StandingsPage() {
  const queryClient = getServerQueryClient();
  // Not awaited: the page streams with its skeletons while ESPN answers, and the pending queries hydrate on the client.
  // A failed prefetch is left to the client, which fetches again; the leaders fail on their own, without the standings.
  void queryClient.prefetchQuery(serverQueries.standings());
  void queryClient.prefetchQuery(serverQueries.leaders());

  return (
    <Hydrate>
      <section className="py-6 md:py-8">
        <Standings />
      </section>
    </Hydrate>
  );
}
