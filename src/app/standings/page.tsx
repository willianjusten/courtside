import Standings from "@/features/standings/components/Standings";
import { getServerQueryClient, Hydrate } from "@/lib/react-query/server";
import { leadersServerQuery, standingsServerQuery } from "@/api/server";

export default function StandingsPage() {
  const queryClient = getServerQueryClient();
  // Not awaited: the page streams with its skeletons while ESPN answers, and the pending queries hydrate on the client.
  // A failed prefetch is left to the client, which fetches again; the leaders fail on their own, without the standings.
  void queryClient.prefetchQuery(standingsServerQuery());
  void queryClient.prefetchQuery(leadersServerQuery());

  return (
    <Hydrate>
      <section className="py-6 md:py-8">
        <Standings />
      </section>
    </Hydrate>
  );
}
