"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import TeamRoster from "@/app/components/TeamRoster";
import TeamSchedule from "@/app/components/TeamSchedule";
import type { TeamSlug } from "@/app/lib/domain/team";
import {
  favoritesStore,
  useFavoriteTeamIds,
} from "@/app/lib/favorites/use-favorite-team-ids";
import { standingsQueryOptions } from "@/app/lib/queries/standings";
import { useTeamScoreboard } from "@/app/lib/queries/use-team-scoreboard";
import {
  teamDetailQueryOptions,
  teamRosterQueryOptions,
  teamScheduleQueryOptions,
} from "@/app/lib/queries/team";
import type { StandingsQueryState } from "@/app/lib/standings/standings-view";
import { useBrowserTimeZone } from "@/app/lib/time/use-browser-time-zone";
import {
  buildTeamView,
  type TeamQueryState,
  type TeamScheduleExpansions,
} from "@/app/lib/team/team-view";
import { TeamGlow, TeamHeader } from "./header";
import { TeamSections } from "./sections";

type TeamPageProps = {
  teamId: string;
  slug: TeamSlug;
};

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
  const scoreboardGames = useTeamScoreboard(teamId, games ?? null);
  const { data: players } = useQuery(teamRosterQueryOptions(teamId));
  const favoriteTeamIds = useFavoriteTeamIds();
  const timeZone = useBrowserTimeZone();
  const [scheduleExpansions, setScheduleExpansions] =
    useState<TeamScheduleExpansions>({ upcoming: 0, results: 0 });

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
    games: games ?? null,
    scoreboardGames,
    players: players ?? null,
    timeZone,
    scheduleExpansions,
    tabParam,
    favoriteTeamIds,
  });

  // The loading and error states arrive with the team page screen states.
  if (screen.kind !== "ready") return null;

  return (
    <div className="flex flex-col gap-4 md:gap-7">
      <TeamGlow screen={screen} />
      <TeamHeader
        screen={screen}
        onToggleFollow={() => favoritesStore().toggle(screen.follow.teamId)}
      />
      <TeamSections
        tabs={tabs}
        // Replacing the entry keeps the tab in the URL without adding a history step per tab.
        onSelectTab={({ href }) => window.history.replaceState(null, "", href)}
        schedule={
          screen.schedule && (
            <TeamSchedule
              schedule={screen.schedule}
              onShowMore={(listId) =>
                setScheduleExpansions((expansions) => ({
                  ...expansions,
                  [listId]: expansions[listId] + 1,
                }))
              }
            />
          )
        }
        roster={screen.roster && <TeamRoster players={screen.roster} />}
      />
    </div>
  );
}

export default function TeamPage(props: TeamPageProps) {
  const tabParam = useSearchParams()?.get("tab") ?? null;
  return <TeamPageContent {...props} tabParam={tabParam} />;
}
