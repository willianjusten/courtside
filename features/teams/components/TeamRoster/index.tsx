"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { FOCUS_RING_CLASS_NAME } from "@/features/scoreboard/components/DatePicker/DatePickerTrigger";
import {
  PANEL_HEADING_CLASS_NAME,
  PANEL_SURFACE_CLASS_NAME,
} from "@/components/panel-styles";
import { resizedImageUrl } from "@/lib/espn";
import { strings } from "@/lib/strings";
import type { TeamRosterPlayer } from "@/features/teams/team-view";

const HEADING_ID = "team-roster";
// Close to the 1040x760 aspect ratio of ESPN headshots, cropped slightly to fill the box.
const HEADSHOT_WIDTH = 32;
const HEADSHOT_HEIGHT = 24;
// Requested at twice the display size so headshots stay sharp on high-density screens.
const HEADSHOT_REQUEST_SCALE = 2;
const HEADSHOT_CLASS_NAME =
  "h-6 w-8 shrink-0 rounded-md bg-white/6 object-cover";
// About the rows a phone shows under the header and tabs; their headshots load right away and the rest wait for the scroll.
const ABOVE_THE_FOLD_ROW_COUNT = 6;

type RosterColumn = keyof typeof strings.team.roster.columnNames;

function ColumnHeader({ column }: { column: RosterColumn }) {
  const { roster } = strings.team;

  return (
    <th scope="col" className="px-3 py-2">
      <span aria-hidden="true">{roster[column]}</span>
      <span className="sr-only">{roster.columnNames[column]}</span>
    </th>
  );
}

function Headshot({
  headshotUrl,
  isAboveTheFold,
}: {
  headshotUrl: string | null;
  isAboveTheFold: boolean;
}) {
  if (!headshotUrl) {
    return <span aria-hidden="true" className={HEADSHOT_CLASS_NAME} />;
  }

  return (
    <img
      src={resizedImageUrl(
        headshotUrl,
        HEADSHOT_WIDTH * HEADSHOT_REQUEST_SCALE,
        HEADSHOT_HEIGHT * HEADSHOT_REQUEST_SCALE,
      )}
      // The name sits next to the photo, so the photo adds nothing for screen readers.
      alt=""
      width={HEADSHOT_WIDTH}
      height={HEADSHOT_HEIGHT}
      loading={isAboveTheFold ? undefined : "lazy"}
      className={HEADSHOT_CLASS_NAME}
    />
  );
}

const INJURY_STATUS_CLASS_NAME =
  "shrink-0 rounded-full border border-warning/32 bg-warning/8 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-warning-soft";

// Opens on hover with a mouse and on tap or Enter otherwise, since touch screens have no hover. A popover, unlike a
// tooltip, also escapes the roster's scroll box.
function InjuryReport({
  status,
  comment,
}: {
  status: string;
  comment: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger
        className={`${INJURY_STATUS_CLASS_NAME} cursor-help ${FOCUS_RING_CLASS_NAME}`}
        onPointerEnter={({ pointerType }) => {
          if (pointerType === "mouse") setIsOpen(true);
        }}
        onPointerLeave={({ pointerType }) => {
          if (pointerType === "mouse") setIsOpen(false);
        }}
      >
        {status}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          role="tooltip"
          side="top"
          sideOffset={6}
          collisionPadding={16}
          // Opening on hover must not move the keyboard focus away from where it is.
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="z-50 max-w-[min(300px,calc(100vw-2rem))] rounded-xl border border-white/10 bg-white/4.5 px-3 py-2 text-xs font-normal text-foreground shadow-[0_24px_48px_rgb(0_0_0/0.45)] backdrop-blur-xl"
        >
          {comment}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function InjuryStatus({
  status,
  comment,
}: {
  status: string;
  comment: string | null;
}) {
  if (comment) return <InjuryReport status={status} comment={comment} />;
  return <span className={INJURY_STATUS_CLASS_NAME}>{status}</span>;
}

export default function TeamRoster({
  players,
  isAboveTheFold = false,
}: {
  players: TeamRosterPlayer[];
  // True when the mobile Roster tab opens the page; otherwise the roster waits in a hidden tab on mobile.
  isAboveTheFold?: boolean;
}) {
  const { roster } = strings.team;

  return (
    <section
      aria-labelledby={HEADING_ID}
      className={`flex flex-col gap-2 ${PANEL_SURFACE_CLASS_NAME}`}
    >
      <h2 id={HEADING_ID} className={PANEL_HEADING_CLASS_NAME}>
        {roster.title}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <ColumnHeader column="jersey" />
              <ColumnHeader column="player" />
              <ColumnHeader column="position" />
              <ColumnHeader column="age" />
              <ColumnHeader column="height" />
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
              <tr key={player.id} className="border-t border-white/10">
                <td className="px-3 py-2 tabular-nums">{player.jersey}</td>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2.5">
                    <Headshot
                      headshotUrl={player.headshotUrl}
                      isAboveTheFold={
                        isAboveTheFold && index < ABOVE_THE_FOLD_ROW_COUNT
                      }
                    />
                    {/* The status wraps under the name, so a long one like "Day-To-Day" doesn't widen the table past the side column. */}
                    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      {player.name}
                      {player.injuryStatus && (
                        <InjuryStatus
                          status={player.injuryStatus}
                          comment={player.injuryComment}
                        />
                      )}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2">{player.position}</td>
                <td className="px-3 py-2 tabular-nums">{player.age}</td>
                <td className="px-3 py-2 whitespace-nowrap">{player.height}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
