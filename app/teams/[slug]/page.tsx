import { notFound } from "next/navigation";
import TeamPage from "@/app/components/TeamPage";
import { getServerQueryClient, Hydrate } from "@/app/lib/query/server";
import { serverQueries } from "@/app/lib/query/server-queries";

// Rendered per request from the server's memory cache instead of ISR: a regenerated team page wrote ~330 KB
// of HTML and RSC to the ISR cache, every five minutes, for every team.
export const dynamic = "force-dynamic";

type TeamPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TeamRoute({ params }: TeamPageProps) {
  const { slug } = await params;
  const queryClient = getServerQueryClient();
  const teams = await queryClient.fetchQuery(serverQueries.teams());
  const team = teams.find((listedTeam) => listedTeam.slug === slug);
  if (!team) notFound();

  // A failed prefetch is left to the client, which fetches again.
  await Promise.all([
    queryClient.prefetchQuery(serverQueries.teamDetail(team.id)),
    queryClient.prefetchQuery(serverQueries.teamSchedules(team.id)),
    queryClient.prefetchQuery(serverQueries.teamRoster(team.id)),
    queryClient.prefetchQuery(serverQueries.standings()),
    queryClient.prefetchQuery(serverQueries.teamLeaders(team.id)),
  ]);

  return (
    <Hydrate>
      <section className="py-6 md:py-9">
        <TeamPage teamId={team.id} slug={slug} />
      </section>
    </Hydrate>
  );
}
