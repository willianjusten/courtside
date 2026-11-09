import { notFound } from "next/navigation";
import TeamPage from "@/features/teams/components/TeamPage";
import { getServerQueryClient, Hydrate } from "@/lib/query/server";
import { teamLeadersServerQuery } from "@/features/leaders/queries/server";
import { standingsServerQuery } from "@/features/standings/queries/server";
import {
  teamDetailServerQuery,
  teamRosterServerQuery,
  teamSchedulesServerQuery,
  teamsServerQuery,
} from "@/features/teams/queries/server";

// Rendered per request from the server's memory cache instead of ISR: a regenerated team page wrote ~330 KB
// of HTML and RSC to the ISR cache, every five minutes, for every team.
export const dynamic = "force-dynamic";

type TeamPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TeamRoute({ params }: TeamPageProps) {
  const { slug } = await params;
  const queryClient = getServerQueryClient();
  const teams = await queryClient.fetchQuery(teamsServerQuery());
  const team = teams.find((listedTeam) => listedTeam.slug === slug);
  if (!team) notFound();

  // A failed prefetch is left to the client, which fetches again.
  await Promise.all([
    queryClient.prefetchQuery(teamDetailServerQuery(team.id)),
    queryClient.prefetchQuery(teamSchedulesServerQuery(team.id)),
    queryClient.prefetchQuery(teamRosterServerQuery(team.id)),
    queryClient.prefetchQuery(standingsServerQuery()),
    queryClient.prefetchQuery(teamLeadersServerQuery(team.id)),
  ]);

  return (
    <Hydrate>
      <section className="py-6 md:py-9">
        <TeamPage teamId={team.id} slug={slug} />
      </section>
    </Hydrate>
  );
}
