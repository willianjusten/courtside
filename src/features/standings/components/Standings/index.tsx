"use client";

import type { StandingsQueryState } from "@/types/standings";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  EmptyState,
  RetryableError,
  StaleNotice,
} from "@/components/ui/DataStates";
import LeagueLeaders from "@/features/standings/components/LeagueLeaders";
import { useFavoriteTeamIds } from "@/stores/favorites/use-favorite-team-ids";
import { leadersQueryOptions } from "@/api/leaders";
import { standingsQueryOptions } from "@/api/standings";
import {
  buildStandingsView,
  type ConferenceOption,
  type LeadersQueryState,
  type StandingsViewOption,
} from "@/features/standings/utils/standings-view";
import { strings } from "@/config/strings";
import { StandingsLegend, StandingsTable } from "./standings-table";
import {
  ConferenceSwitchSkeleton,
  StandingsHeaderSkeleton,
  StandingsTableLoading,
} from "./states";

function ConferenceSwitch({ options }: { options: ConferenceOption[] }) {
  return (
    <div
      role="group"
      aria-label={strings.standings.conferenceSwitch}
      className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.selected}
          // Replacing the entry keeps the conference in the URL without adding a history step per switch.
          onClick={() => window.history.replaceState(null, "", option.href)}
          className={`min-h-10 grow cursor-pointer rounded-full px-5.5 text-[13px] font-bold tracking-[0.04em] transition-colors md:min-h-11 ${option.selected ? "bg-white/92 text-ink" : "text-secondary hover:bg-white/8"} focus-ring`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Mobile only: desktop shows the standings and the leaders side by side.
function ViewSwitch({ options }: { options: StandingsViewOption[] }) {
  return (
    <div
      role="group"
      aria-label={strings.standings.views.label}
      className="flex gap-5 border-b border-white/10 md:hidden"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.selected}
          // Replacing the entry keeps the view in the URL without adding a history step per switch.
          onClick={() => window.history.replaceState(null, "", option.href)}
          className={`-mb-px min-h-11 cursor-pointer border-b-2 px-0.5 text-sm font-bold tracking-[0.04em] ${option.selected ? "border-accent text-foreground" : "border-transparent text-muted"} focus-ring`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function Standings() {
  const {
    data: standings,
    error,
    isFetching,
    isRefetchError,
    refetch,
  } = useQuery(standingsQueryOptions());
  const {
    data: leaderCategories,
    error: leadersError,
    isFetching: isFetchingLeaders,
    isRefetchError: isLeadersRefetchError,
    refetch: refetchLeaders,
  } = useQuery(leadersQueryOptions());
  const favoriteTeamIds = useFavoriteTeamIds();
  const searchParams = useSearchParams();
  const conferenceParam = searchParams?.get("conf") ?? null;
  const viewParam = searchParams?.get("view") ?? null;

  // Data is checked before the error: a failed refetch keeps the last standings instead of hiding them.
  const query: StandingsQueryState = standings
    ? isRefetchError
      ? { status: "stale", standings }
      : { status: "success", standings }
    : error
      ? { status: "error" }
      : { status: "loading" };
  // A failed refetch keeps the last leaders too.
  const leadersQuery: LeadersQueryState = leaderCategories
    ? isLeadersRefetchError
      ? { status: "stale", categories: leaderCategories }
      : { status: "success", categories: leaderCategories }
    : leadersError
      ? { status: "error" }
      : { status: "loading" };
  const { screen, selectedView, viewOptions, leaders } = buildStandingsView({
    query,
    leadersQuery,
    favoriteTeamIds,
    conferenceParam,
    viewParam,
  });
  const showsLeadersOnMobile = selectedView === "leaders";

  return (
    <div className="flex flex-col gap-6 md:gap-7">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:justify-between">
        <header className="flex flex-col gap-0.5 md:gap-1">
          {screen.kind === "loading" && <StandingsHeaderSkeleton />}
          {screen.kind === "ready" && (
            <span className="font-display text-[11px] tracking-[0.24em] text-accent md:font-sans md:text-[13px] md:tracking-[0.18em]">
              {screen.seasonLabel}
            </span>
          )}
          <h1 className="font-display text-[34px] leading-none uppercase md:text-[58px] md:leading-[0.92]">
            {strings.standings.title}
          </h1>
        </header>
        <ViewSwitch options={viewOptions} />
        {(screen.kind === "ready" || screen.kind === "loading") && (
          <div className={showsLeadersOnMobile ? "hidden md:block" : ""}>
            {screen.kind === "ready" ? (
              <ConferenceSwitch options={screen.conferenceOptions} />
            ) : (
              <ConferenceSwitchSkeleton />
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-8 md:gap-10">
        <section
          aria-label={
            screen.kind === "ready"
              ? strings.standings.conferenceTable(screen.conferenceLabel)
              : strings.standings.title
          }
          className={`min-w-0 flex-col gap-3.5 ${showsLeadersOnMobile ? "hidden md:flex" : "flex"}`}
        >
          {screen.kind === "loading" && <StandingsTableLoading />}
          {screen.kind === "error" && (
            <RetryableError
              message={strings.standings.error}
              detail={strings.standings.errorDetail}
              onRetry={() => refetch()}
              isRetrying={isFetching}
            />
          )}
          {screen.kind === "empty" && <EmptyState message={screen.message} />}
          {screen.kind === "ready" && (
            <>
              {screen.staleNotice && (
                <StaleNotice message={screen.staleNotice} />
              )}
              <div className="overflow-x-auto md:card md:border-white/10 md:bg-white/3 md:px-3 md:pt-2 md:pb-2.5">
                <StandingsTable
                  label={strings.standings.conferenceTable(
                    screen.conferenceLabel,
                  )}
                  rows={screen.rows}
                />
              </div>
              <StandingsLegend
                zoneLegend={screen.legend}
                clincherLegend={screen.clincherLegend}
              />
            </>
          )}
        </section>
        <div
          className={`min-w-0 ${showsLeadersOnMobile ? "" : "hidden md:block"}`}
        >
          <LeagueLeaders
            leaders={leaders}
            onRetry={() => refetchLeaders()}
            isRetrying={isFetchingLeaders}
            isAboveTheFold={showsLeadersOnMobile}
          />
        </div>
      </div>
    </div>
  );
}
