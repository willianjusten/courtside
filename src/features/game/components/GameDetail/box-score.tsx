"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type {
  BoxScoreAthleteRow,
  BoxScoreColumn,
  BoxScoreLine,
  BoxScorePlayerRow,
  BoxScoreView,
  PlusMinusTone,
  TeamBoxScoreView,
} from "@/features/game/utils/game-view";
import type { TeamSide } from "@/utils/team-colors";
import { strings } from "@/config/strings";
import { Section } from "./sections";
import { ToggleGroup } from "./toggle-group";

const HEADING_ID = "game-box-score";
const CELL_CLASS_NAME = "px-1.5 py-2.5 whitespace-nowrap";
// On mobile the player column stays put while the stats scroll under it, so it covers what passes beneath with the
// page color. The card's tint is a gradient layer over it, blended the same way as the card so the two match.
// Desktop fits every column, so the column sits back in the flow there.
const STICKY_CLASS_NAME =
  "sticky left-0 bg-ink bg-linear-to-r from-white/4.5 to-white/4.5 md:static md:bg-transparent md:bg-none";
const PLUS_MINUS_CLASS_NAMES: Record<NonNullable<PlusMinusTone>, string> = {
  positive: "text-win",
  negative: "text-loss",
};

function PlayerName({ row }: { row: BoxScoreAthleteRow }) {
  return (
    <th
      scope="row"
      className={`text-left font-normal ${CELL_CLASS_NAME} ${STICKY_CLASS_NAME}`}
    >
      <span className="inline-block w-6 text-[11px] text-muted">
        {row.jersey}
      </span>
      {/* The short name keeps the mobile table narrow. */}
      <span className="md:hidden">{row.shortName}</span>
      <span className="hidden md:inline">{row.name}</span>
      {row.position && (
        <span className="ml-1.5 text-[11px] text-muted">{row.position}</span>
      )}
    </th>
  );
}

function StatCells({
  columns,
  stats,
  plusMinusTone = null,
}: {
  columns: BoxScoreColumn[];
  stats: BoxScoreLine;
  plusMinusTone?: PlusMinusTone;
}) {
  return columns.map(({ stat }) => {
    const cellClassName =
      stat === "points"
        ? "font-display text-[17px] md:text-lg"
        : stat === "plusMinus" && plusMinusTone
          ? `font-bold ${PLUS_MINUS_CLASS_NAMES[plusMinusTone]}`
          : "text-secondary";
    return (
      <td
        key={stat}
        className={`text-right ${CELL_CLASS_NAME} ${cellClassName}`}
      >
        {stats[stat]}
      </td>
    );
  });
}

// A tbody headed by its group's label, left out when the group is empty.
function RowGroup<Row extends BoxScoreAthleteRow>({
  label,
  rows,
  columnSpan,
  renderCells,
}: {
  label: string;
  rows: Row[];
  columnSpan: number;
  renderCells: (row: Row) => ReactNode;
}) {
  if (rows.length === 0) return null;

  return (
    <tbody>
      <tr>
        <th
          scope="rowgroup"
          colSpan={columnSpan}
          className="px-1.5 pt-3 pb-1 text-left text-[10px] font-medium tracking-[0.12em] text-muted uppercase"
        >
          {/* The label spans every column, so it holds to the left edge as the stats scroll. */}
          <span className="sticky left-1.5">{label}</span>
        </th>
      </tr>
      {rows.map((row) => (
        <tr key={row.id} className="border-t border-white/6">
          <PlayerName row={row} />
          {renderCells(row)}
        </tr>
      ))}
    </tbody>
  );
}

function TeamTable({
  team,
  columns,
  didNotPlayLabel,
}: {
  team: TeamBoxScoreView;
  columns: BoxScoreColumn[];
  didNotPlayLabel: string;
}) {
  const { groups } = strings.game.boxScore;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] border-collapse text-[13px] tabular-nums md:min-w-0">
        <caption className="sr-only">
          {strings.game.boxScore.caption(team.teamName)}
        </caption>
        <thead>
          <tr className="text-[10px] tracking-[0.12em] text-muted uppercase">
            <th
              scope="col"
              className={`px-1.5 py-2 text-left font-medium ${STICKY_CLASS_NAME}`}
            >
              {strings.game.boxScore.player}
            </th>
            {columns.map(({ stat, label }) => (
              <th
                key={stat}
                scope="col"
                className="px-1.5 py-2 text-right font-medium"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        {[
          { label: groups.starters, rows: team.starters },
          { label: groups.bench, rows: team.bench },
        ].map(({ label, rows }) => (
          <RowGroup
            key={label}
            label={label}
            rows={rows}
            columnSpan={columns.length + 1}
            renderCells={(row: BoxScorePlayerRow) => (
              <StatCells
                columns={columns}
                stats={row.stats}
                plusMinusTone={row.plusMinusTone}
              />
            )}
          />
        ))}
        <RowGroup
          label={didNotPlayLabel}
          rows={team.didNotPlay}
          columnSpan={columns.length + 1}
          renderCells={(row) => (
            <td
              colSpan={columns.length}
              className={`text-left text-xs text-muted ${CELL_CLASS_NAME}`}
            >
              {row.reason}
            </td>
          )}
        />
        {team.totals && (
          <tfoot>
            <tr className="border-t border-white/16 font-bold">
              <th
                scope="row"
                className={`text-left ${CELL_CLASS_NAME} ${STICKY_CLASS_NAME}`}
              >
                {strings.game.boxScore.totals}
              </th>
              <StatCells columns={columns} stats={team.totals} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function BoxScore({ boxScore }: { boxScore: BoxScoreView | null }) {
  // Kept across refetches, so a live game updates the picked team in place.
  const [selectedSide, setSelectedSide] = useState<TeamSide>("away");
  const selectedTeam = boxScore?.teams.find(
    ({ side }) => side === selectedSide,
  );

  return (
    <Section
      headingId={HEADING_ID}
      title={strings.game.boxScore.title}
      action={
        boxScore && (
          <ToggleGroup
            label={strings.game.boxScore.teamToggle}
            options={boxScore.teams.map(({ side, teamName }) => ({
              value: side,
              label: teamName,
            }))}
            selectedValue={selectedSide}
            onSelect={setSelectedSide}
          />
        )
      }
    >
      {boxScore && selectedTeam ? (
        <TeamTable
          team={selectedTeam}
          columns={boxScore.columns}
          didNotPlayLabel={boxScore.didNotPlayLabel}
        />
      ) : (
        <p className="text-sm text-muted">{strings.game.boxScore.empty}</p>
      )}
    </Section>
  );
}
