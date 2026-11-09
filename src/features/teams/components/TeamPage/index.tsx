"use client";

import type { StandingsQueryState } from "@/types/standings";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { notFound, useSearchParams } from "next/navigation";
import { RetryableError, StaleNotice } from "@/components/ui/DataStates";
import LeadersPanel from "@/components/LeadersPanel/index";
import TeamRoster from "@/features/teams/components/TeamRoster";
import TeamSchedule from "@/features/teams/components/TeamSchedule";
import type { TeamSchedules, TeamSlug } from "@/types/team";
import { ApiRequestError } from "@/lib/react-query/fetch-api";
import {
  favoritesStore,
  useFavoriteTeamIds,
} from "@/stores/favorites/use-favorite-team-ids";
import { standingsQueryOptions } from "@/api/standings";
import { useTeamScoreboard } from "@/features/teams/api/use-team-scoreboard";
import {
  teamDetailQueryOptions,
  teamRosterQueryOptions,
  teamSchedulesQueryOptions,
} from "@/features/teams/api/team";
import { strings } from "@/config/strings";
import { useBrowserTimeZone } from "@/hooks/use-browser-time-zone";
import {
  buildTeamView,
  type TeamDataQueryState,
  type TeamQueryState,
  type TeamScheduleExpansions,
  type TeamSection,
} from "@/features/teams/utils/team-view";
import { TeamGlow, TeamHeader } from "./header";
import { TeamSections } from "./sections";
import {
  TeamHeaderLoading,
  TeamLeadersLoading,
  TeamRosterLoading,
  TeamScheduleLoading,
} from "./states";
import { teamLeadersQueryOptions } from "@/api/leaders";

const NOT_FOUND_STATUS = 404;
const TEAM_LEADERS_HEADING_ID = "team-leaders";

function isUnknownTeamError(error: Error | null) {
  return error instanceof ApiRequestError && error.status === NOT_FOUND_STATUS;
}

// Data is checked before the error: a failed refetch keeps the last data instead of hiding it.
function dataQueryStateOf<Data>({
  data,
  error,
  isRefetchError,
}: UseQueryResult<Data>): TeamDataQueryState<Data> {
  if (data !== undefined) {
    return isRefetchError
      ? { status: "stale", data }
      : { status: "success", data };
  }
  return error ? { status: "error" } : { status: "loading" };
}

type Retryable = Pick<UseQueryResult, "refetch" | "isFetching">;

function TeamError({
  message,
  query: { refetch, isFetching },
}: {
  message: string;
  query: Retryable;
}) {
  return (
    <RetryableError
      message={message}
      detail={strings.team.errorDetail}
      onRetry={() => refetch()}
      isRetrying={isFetching}
    />
  );
}

function SectionContent<Content>({
  section,
  loading,
  query,
  children,
}: {
  section: TeamSection<Content>;
  loading: ReactNode;
  query: Retryable;
  children: (content: Content) => ReactNode;
}) {
  if (section.kind === "loading") return loading;
  if (section.kind === "error") {
    return <TeamError message={section.message} query={query} />;
  }
  return (
    <>
      {section.staleNotice && <StaleNotice message={section.staleNotice} />}
      {children(section.content)}
    </>
  );
}

const regularSeasonOf = (schedules: TeamSchedules) => schedules.regularSeason;
const postseasonOf = (schedules: TeamSchedules) => schedules.postseason;

type TeamPageProps = {
  teamId: string;
  slug: TeamSlug;
};

function TeamPageContent({
  teamId,
  slug,
  tabParam,
}: TeamPageProps & { tabParam: string | null }) {
  const teamQuery = useQuery(teamDetailQueryOptions(teamId));
  const { data: team, error, isRefetchError } = teamQuery;
  const {
    data: standings,
    error: standingsError,
    isRefetchError: isStandingsRefetchError,
  } = useQuery(standingsQueryOptions());
  const scheduleQuery = useQuery({
    ...teamSchedulesQueryOptions(teamId),
    select: regularSeasonOf,
  });
  const games = scheduleQuery.data;
  const { data: playoffGames } = useQuery({
    ...teamSchedulesQueryOptions(teamId),
    select: postseasonOf,
  });
  // A playoff game day reads the scoreboard as well, so the live playoff game updates in place.
  const scoreboardGames = useTeamScoreboard(
    teamId,
    games ? [...games, ...(playoffGames ?? [])] : null,
  );
  const rosterQuery = useQuery(teamRosterQueryOptions(teamId));
  const leadersQuery = useQuery(teamLeadersQueryOptions(teamId));
  const favoriteTeamIds = useFavoriteTeamIds();
  const timeZone = useBrowserTimeZone();
  const [scheduleExpansions, setScheduleExpansions] =
    useState<TeamScheduleExpansions>({ upcoming: 0, results: 0 });

  // Data is checked before the error: a failed refetch keeps the last team instead of hiding it.
  const query: TeamQueryState = team
    ? isRefetchError
      ? { status: "stale", team }
      : { status: "success", team }
    : isUnknownTeamError(error)
      ? { status: "not-found" }
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
    scheduleQuery: dataQueryStateOf(scheduleQuery),
    playoffGames: playoffGames ?? null,
    scoreboardGames,
    rosterQuery: dataQueryStateOf(rosterQuery),
    leadersQuery: dataQueryStateOf(leadersQuery),
    timeZone,
    scheduleExpansions,
    tabParam,
    favoriteTeamIds,
  });

  // Replacing the entry keeps the tab in the URL without adding a history step per tab.
  const selectTab = ({ href }: { href: string }) =>
    window.history.replaceState(null, "", href);

  if (screen.kind === "not-found") notFound();
  if (screen.kind === "error") {
    return <TeamError message={strings.team.error} query={teamQuery} />;
  }
  if (screen.kind === "loading") {
    return (
      <div className="flex flex-col gap-4 md:gap-7">
        <TeamHeaderLoading />
        <TeamSections
          tabs={tabs}
          onSelectTab={selectTab}
          schedule={<TeamScheduleLoading />}
          roster={<TeamRosterLoading />}
          leaders={<TeamLeadersLoading />}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-7">
      <TeamGlow screen={screen} />
      {screen.staleNotice && <StaleNotice message={screen.staleNotice} />}
      <TeamHeader
        screen={screen}
        onToggleFollow={() => favoritesStore().toggle(screen.follow.teamId)}
      />
      <TeamSections
        tabs={tabs}
        onSelectTab={selectTab}
        schedule={
          <SectionContent
            section={screen.schedule}
            loading={<TeamScheduleLoading />}
            query={scheduleQuery}
          >
            {(schedule) => (
              <TeamSchedule
                schedule={schedule}
                isAboveTheFold={tabs.selected === "schedule"}
                onShowMore={(listId) =>
                  setScheduleExpansions((expansions) => ({
                    ...expansions,
                    [listId]: expansions[listId] + 1,
                  }))
                }
              />
            )}
          </SectionContent>
        }
        roster={
          <SectionContent
            section={screen.roster}
            loading={<TeamRosterLoading />}
            query={rosterQuery}
          >
            {(players) => (
              <TeamRoster
                players={players}
                isAboveTheFold={tabs.selected === "roster"}
              />
            )}
          </SectionContent>
        }
        leaders={
          <SectionContent
            section={screen.leaders}
            loading={<TeamLeadersLoading />}
            query={leadersQuery}
          >
            {(categories) => (
              <LeadersPanel
                categories={categories}
                title={strings.team.leaders.title}
                headingId={TEAM_LEADERS_HEADING_ID}
              />
            )}
          </SectionContent>
        }
      />
    </div>
  );
}

export default function TeamPage(props: TeamPageProps) {
  const tabParam = useSearchParams()?.get("tab") ?? null;
  return <TeamPageContent {...props} tabParam={tabParam} />;
}
