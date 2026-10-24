import Link from "next/link";
import { FOCUS_RING_CLASS_NAME } from "@/app/components/DatePicker/DatePickerTrigger";
import TeamLogo from "@/app/components/TeamLogo";
import type {
  StandingsLegendEntry,
  StandingsTableRow,
  StandingsZone,
} from "@/app/lib/standings/standings-view";
import type { StreakKind } from "@/app/lib/standings/streak";
import { strings } from "@/app/lib/strings";

const LOGO_SIZE = 26;

const SEED_CLASS_NAME: Record<StandingsZone, string> = {
  playoff: "border-playoff/45 bg-playoff/18 text-playoff-soft",
  "play-in": "border-play-in/42 bg-play-in/16 text-play-in-soft",
  none: "border-white/10 bg-white/5 text-muted",
};

const LEGEND_SWATCH_CLASS_NAME: Record<StandingsLegendEntry["zone"], string> = {
  playoff: "bg-playoff",
  "play-in": "bg-play-in",
};

const STREAK_CLASS_NAME: Record<StreakKind, string> = {
  win: "text-win",
  loss: "text-loss",
};

// Each cell carries the row surface, since a table row cannot take a border radius.
const CELL_CLASS_NAME =
  "border-y border-white/7 bg-white/3.5 group-hover:bg-white/6 group-data-favorite:border-favorite/30 group-data-favorite:bg-favorite/7";

function FavoriteStar() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label={strings.standings.favorite}
      className="shrink-0 text-favorite"
    >
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  );
}

function StandingsTableRowView({ row }: { row: StandingsTableRow }) {
  return (
    <tr className="group relative" data-favorite={row.isFavorite || undefined}>
      <td
        className={`rounded-l-tile border-l py-2 pr-1.5 pl-2.5 ${CELL_CLASS_NAME}`}
      >
        <span
          className={`flex size-6.5 items-center justify-center rounded-[9px] border font-display text-[15px] ${SEED_CLASS_NAME[row.zone]}`}
        >
          {row.seed}
        </span>
      </td>
      <th
        scope="row"
        className={`px-1.5 text-left font-normal ${CELL_CLASS_NAME}`}
      >
        <Link
          href={row.href}
          // The overlay stretches the link over the whole row, so any cell opens the team page.
          className={`flex min-h-11 min-w-0 items-center gap-2 rounded-md after:absolute after:inset-0 after:content-[''] ${FOCUS_RING_CLASS_NAME}`}
        >
          <TeamLogo logoUrl={row.logoUrl} size={LOGO_SIZE} lazy />
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1 text-[13px] font-medium">
              <span className="truncate" aria-hidden="true">
                {row.name}
              </span>
              <span className="sr-only">{row.displayName}</span>
              {row.isFavorite && <FavoriteStar />}
            </span>
            <span
              className="truncate text-[10px] text-muted"
              aria-hidden="true"
            >
              {row.location}
            </span>
          </span>
          {row.zoneLabel && <span className="sr-only">, {row.zoneLabel}</span>}
        </Link>
      </th>
      <td
        className={`px-1.5 text-center font-display text-[17px] ${CELL_CLASS_NAME}`}
      >
        {row.record}
      </td>
      <td
        className={`px-1.5 text-right text-xs text-secondary ${CELL_CLASS_NAME}`}
      >
        {row.winPercent}
      </td>
      <td
        className={`rounded-r-tile border-r py-2 pr-2.5 pl-1.5 text-right text-xs font-bold ${CELL_CLASS_NAME} ${row.streakKind ? STREAK_CLASS_NAME[row.streakKind] : "text-muted"}`}
      >
        {row.streak}
      </td>
    </tr>
  );
}

export function StandingsTable({
  label,
  rows,
}: {
  label: string;
  rows: StandingsTableRow[];
}) {
  const { columns } = strings.standings;

  return (
    <table className="w-full table-fixed border-separate border-spacing-y-1 tabular-nums">
      <caption className="sr-only">{label}</caption>
      <colgroup>
        <col className="w-11.5" />
        <col />
        <col className="w-14" />
        <col className="w-14" />
        <col className="w-13" />
      </colgroup>
      <thead>
        <tr className="text-[10px] tracking-[0.12em] text-muted">
          <th scope="col" className="pb-1.5 pl-2.5 text-left font-medium">
            {columns.seed}
          </th>
          <th scope="col" className="px-1.5 pb-1.5 text-left font-medium">
            {columns.team}
          </th>
          <th scope="col" className="px-1.5 pb-1.5 text-center font-medium">
            {columns.record}
          </th>
          <th scope="col" className="px-1.5 pb-1.5 text-right font-medium">
            {columns.winPercent}
          </th>
          <th
            scope="col"
            className="pr-2.5 pb-1.5 pl-1.5 text-right font-medium"
          >
            {columns.streak}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <StandingsTableRowView key={row.teamId} row={row} />
        ))}
      </tbody>
    </table>
  );
}

export function ZoneLegend({ legend }: { legend: StandingsLegendEntry[] }) {
  return (
    <div className="flex flex-col gap-2 card border-white/9 bg-white/4 p-3.5 md:flex-row md:flex-wrap md:items-center md:gap-x-6 md:border-0 md:bg-transparent md:p-1">
      <ul className="contents">
        {legend.map((entry) => (
          <li
            key={entry.zone}
            className="flex items-center gap-2.5 text-xs text-secondary"
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-5.5 rounded-full ${LEGEND_SWATCH_CLASS_NAME[entry.zone]}`}
            />
            {entry.label}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted">{strings.standings.rowHint}</p>
    </div>
  );
}
