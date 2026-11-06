import { Suspense } from "react";
import { notFound } from "next/navigation";
import TeamPage, { TeamPageContent } from "@/app/components/TeamPage";
import { fetchTeams } from "@/app/lib/espn";
// Not in the @/app/lib/espn barrel: the leaders module is server-only and the barrel is also imported by client code.
import { fetchTeamLeaders } from "@/app/lib/espn/leaders";
import { teamLeadersQueryOptions } from "@/app/lib/queries/leaders";
import { standingsQueryOptions } from "@/app/lib/queries/standings";
import {
  teamDetailQueryOptions,
  teamPlayoffScheduleQueryOptions,
  teamRosterQueryOptions,
  teamScheduleQueryOptions,
} from "@/app/lib/queries/team";
import { teamsQueryOptions } from "@/app/lib/queries/teams";
import { getServerQueryClient, Hydrate } from "@/app/lib/query/server";

// Prerendered for every team, then regenerated at most every five minutes, the team schedule's server cache period.
// Forced static because the shared header reads the live scoreboard, which would otherwise render every request.
export const dynamic = "force-static";
export const revalidate = 300;

type TeamPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const teams = await fetchTeams();
  return teams.map(({ slug }) => ({ slug }));
}

export default async function TeamRoute({ params }: TeamPageProps) {
  const { slug } = await params;
  const queryClient = getServerQueryClient();
  const teams = await queryClient.fetchQuery(teamsQueryOptions());
  const team = teams.find((listedTeam) => listedTeam.slug === slug);
  if (!team) notFound();

  // Awaited so the prerendered page carries the data; a failed prefetch is left to the client, which fetches again.
  await Promise.all([
    queryClient.prefetchQuery(teamDetailQueryOptions(team.id)),
    queryClient.prefetchQuery(teamScheduleQueryOptions(team.id)),
    queryClient.prefetchQuery(teamPlayoffScheduleQueryOptions(team.id)),
    queryClient.prefetchQuery(teamRosterQueryOptions(team.id)),
    queryClient.prefetchQuery(standingsQueryOptions()),
    // The server assembles the leaders itself instead of calling its own route handler.
    queryClient.prefetchQuery({
      ...teamLeadersQueryOptions(team.id),
      queryFn: () => fetchTeamLeaders(team.id),
    }),
  ]);

  return (
    <Hydrate>
      <section className="py-6 md:py-9">
        {/* The tab lives in the query string, unknown when prerendering, so the page is prerendered on the default tab. */}
        <Suspense
          fallback={
            <TeamPageContent teamId={team.id} slug={slug} tabParam={null} />
          }
        >
          <TeamPage teamId={team.id} slug={slug} />
        </Suspense>
      </section>
    </Hydrate>
  );
}
