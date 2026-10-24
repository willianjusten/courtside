"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { FOCUS_RING_CLASS_NAME } from "@/app/components/DatePicker/DatePickerTrigger";
import { PANEL_HEADING_CLASS_NAME } from "@/app/components/HomeSidebar/styles";
import TeamRoster from "@/app/components/TeamRoster";
import TeamSchedule from "@/app/components/TeamSchedule";
import type { TeamSlug } from "@/app/lib/domain/team";
import { standingsQueryOptions } from "@/app/lib/queries/standings";
import {
  teamDetailQueryOptions,
  teamRosterQueryOptions,
  teamScheduleQueryOptions,
} from "@/app/lib/queries/team";
import type { StandingsQueryState } from "@/app/lib/standings/standings-view";
import { strings } from "@/app/lib/strings";
import {
  buildTeamView,
  type TeamQueryState,
  type TeamReadyScreen,
} from "@/app/lib/team/team-view";
import { TeamGlow, TeamHeader } from "./header";
import { TeamSections } from "./sections";

const STANDINGS_HEADING_ID = "team-conference-standings";

type TeamPageProps = {
  teamId: string;
  slug: TeamSlug;
};

// Filled with the team's conference table in its own ticket; until then it links to the full standings.
function ConferenceStandings({ screen }: { screen: TeamReadyScreen }) {
  const conferenceName = screen.header.conferenceName;

  return (
    <section
      aria-labelledby={STANDINGS_HEADING_ID}
      className="flex items-center justify-between gap-3"
    >
      <h2 id={STANDINGS_HEADING_ID} className={PANEL_HEADING_CLASS_NAME}>
        {conferenceName ?? strings.team.tabs.standings}
      </h2>
      <Link
        href={screen.standingsHref}
        aria-label={
          conferenceName
            ? strings.team.standings.fullTableLabel(conferenceName)
            : undefined
        }
        className={`flex min-h-11 items-center rounded-full text-xs font-bold text-link ${FOCUS_RING_CLASS_NAME}`}
      >
        {strings.team.standings.fullTable}
      </Link>
    </section>
  );
}

export function TeamPageContent({
  teamId,
  slug,
  tabParam,
}: TeamPageProps & { tabParam: string | null }) {
  const {
    data: team,
    error,
    isRefetchError,
  } = useQuery(teamDetailQueryOptions(teamId));
  const {
    data: standings,
    error: standingsError,
    isRefetchError: isStandingsRefetchError,
  } = useQuery(standingsQueryOptions());
  const { data: games } = useQuery(teamScheduleQueryOptions(teamId));
  const { data: players } = useQuery(teamRosterQueryOptions(teamId));

  // Data is checked before the error: a failed refetch keeps the last team instead of hiding it.
  const query: TeamQueryState = team
    ? isRefetchError
      ? { status: "stale", team }
      : { status: "success", team }
    : error
      ? { status: "error" }
      : { status: "loading" };
  const standingsQuery: StandingsQueryState = standings
    ? isStandingsRefetchError
      ? { status: "stale", standings }
      : { status: "success", standings }
    : standingsError
      ? { status: "error" }
      : { status: "loading" };
  const { screen, tabs } = buildTeamView({
    slug,
    query,
    standingsQuery,
    tabParam,
  });

  // The loading and error states arrive with the team page screen states.
  if (screen.kind !== "ready") return null;

  return (
    <div className="flex flex-col gap-4 md:gap-7">
      <TeamGlow screen={screen} />
      <TeamHeader screen={screen} />
      <TeamSections
        tabs={tabs}
        // Replacing the entry keeps the tab in the URL without adding a history step per tab.
        onSelectTab={({ href }) => window.history.replaceState(null, "", href)}
        schedule={games && <TeamSchedule teamId={teamId} games={games} />}
        roster={players && <TeamRoster players={players} />}
        standings={<ConferenceStandings screen={screen} />}
      />
    </div>
  );
}

export default function TeamPage(props: TeamPageProps) {
  const tabParam = useSearchParams()?.get("tab") ?? null;
  return <TeamPageContent {...props} tabParam={tabParam} />;
}
