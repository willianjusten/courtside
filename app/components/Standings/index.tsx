"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { FOCUS_RING_CLASS_NAME } from "@/app/components/DatePicker/DatePickerTrigger";
import { useFavoriteTeamIds } from "@/app/lib/favorites/use-favorite-team-ids";
import { standingsQueryOptions } from "@/app/lib/queries/standings";
import {
  buildStandingsView,
  type ConferenceOption,
  type StandingsQueryState,
} from "@/app/lib/standings/standings-view";
import { strings } from "@/app/lib/strings";
import { StandingsTable, ZoneLegend } from "./standings-table";

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
          className={`min-h-10 grow cursor-pointer rounded-full px-5.5 text-[13px] font-bold tracking-[0.04em] transition-colors md:min-h-11 ${option.selected ? "bg-white/92 text-ink" : "text-secondary hover:bg-white/8"} ${FOCUS_RING_CLASS_NAME}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function Standings({ sideColumn }: { sideColumn: ReactNode }) {
  const {
    data: standings,
    error,
    isRefetchError,
  } = useQuery(standingsQueryOptions());
  const favoriteTeamIds = useFavoriteTeamIds();
  const conferenceParam = useSearchParams()?.get("conf") ?? null;

  // Data is checked before the error: a failed refetch keeps the last standings instead of hiding them.
  const query: StandingsQueryState = standings
    ? isRefetchError
      ? { status: "stale", standings }
      : { status: "success", standings }
    : error
      ? { status: "error" }
      : { status: "loading" };
  const { screen } = buildStandingsView({
    query,
    favoriteTeamIds,
    conferenceParam,
  });

  return (
    <div className="flex flex-col gap-6 md:gap-7">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:justify-between">
        <header className="flex flex-col gap-0.5 md:gap-1">
          {screen.kind === "ready" && (
            <span className="font-display text-[11px] tracking-[0.24em] text-accent md:font-sans md:text-[13px] md:tracking-[0.18em]">
              {screen.seasonLabel}
            </span>
          )}
          <h1 className="font-display text-[34px] leading-none uppercase md:text-[58px] md:leading-[0.92]">
            {strings.standings.title}
          </h1>
        </header>
        {screen.kind === "ready" && (
          <ConferenceSwitch options={screen.conferenceOptions} />
        )}
      </div>
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section
          aria-label={
            screen.kind === "ready"
              ? strings.standings.conferenceTable(screen.conferenceLabel)
              : strings.standings.title
          }
          className="flex min-w-0 flex-col gap-3.5"
        >
          {screen.kind === "loading" && (
            <p role="status" className="text-sm text-muted">
              {strings.standings.loading}
            </p>
          )}
          {screen.kind === "error" && (
            <p role="alert" className="text-sm text-secondary">
              {strings.standings.error}
            </p>
          )}
          {screen.kind === "ready" && (
            <>
              <div className="md:card md:border-white/10 md:bg-white/3 md:px-3 md:pt-2 md:pb-2.5">
                <StandingsTable
                  label={strings.standings.conferenceTable(
                    screen.conferenceLabel,
                  )}
                  rows={screen.rows}
                />
              </div>
              <ZoneLegend legend={screen.legend} />
            </>
          )}
        </section>
        <div className="min-w-0">{sideColumn}</div>
      </div>
    </div>
  );
}
