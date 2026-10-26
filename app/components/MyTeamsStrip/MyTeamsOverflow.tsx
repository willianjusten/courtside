"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import * as Popover from "@radix-ui/react-popover";
import { FOCUS_RING_CLASS_NAME } from "@/app/components/DatePicker/DatePickerTrigger";
import TeamLogo from "@/app/components/TeamLogo";
import type { MyTeamLink } from "@/app/lib/favorites/my-teams";
import { strings } from "@/app/lib/strings";

const LOGO_SIZE = 22;
// Gives the mouse time to cross the gap from the chip to the list before it closes.
const HOVER_CLOSE_DELAY_MS = 150;

// The followed teams past the strip's first few, behind a +N chip that opens on hover or tap.
export default function MyTeamsOverflow({ teams }: { teams: MyTeamLink[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const cancelClose = () => clearTimeout(closeTimeoutRef.current);
  const openOnMouse = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    setIsOpen(true);
  };
  const closeOnMouse = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    closeTimeoutRef.current = setTimeout(
      () => setIsOpen(false),
      HOVER_CLOSE_DELAY_MS,
    );
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger
        aria-label={strings.myTeams.more(teams.length)}
        onPointerEnter={openOnMouse}
        onPointerLeave={closeOnMouse}
        className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-favorite/40 bg-favorite/10 font-display text-base text-foreground transition-colors hover:bg-favorite/18 ${FOCUS_RING_CLASS_NAME}`}
      >
        +{teams.length}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={strings.myTeams.more(teams.length)}
          align="end"
          sideOffset={8}
          collisionPadding={16}
          onPointerEnter={openOnMouse}
          onPointerLeave={closeOnMouse}
          className="z-50 card border-white/10 bg-white/4.5 p-1.5 text-foreground shadow-[0_24px_48px_rgb(0_0_0/0.45)] backdrop-blur-xl"
        >
          <ul className="flex flex-col">
            {teams.map((team) => (
              <li key={team.teamId}>
                <Link
                  href={team.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex min-h-11 items-center gap-2.5 rounded-[10px] px-2.5 text-sm transition-colors hover:bg-white/6 ${FOCUS_RING_CLASS_NAME}`}
                >
                  <TeamLogo logoUrl={team.logoUrl} size={LOGO_SIZE} />
                  {team.displayName}
                </Link>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
