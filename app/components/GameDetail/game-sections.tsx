"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { FOCUS_RING_CLASS_NAME } from "@/app/components/DatePicker/DatePickerTrigger";
import type { GameTab, GameTabId, GameTabs } from "@/app/lib/game/game-view";
import { strings } from "@/app/lib/strings";

// Every panel stays mounted: on mobile the inactive ones are hidden, and from md up the panels dissolve
// (display: contents) so their sections are placed straight on the one-page grid.
const PANEL_CLASS_NAME =
  "flex flex-col gap-3 outline-none data-[state=inactive]:hidden md:contents md:data-[state=inactive]:contents";

function TabTrigger({ tab }: { tab: GameTab }) {
  return (
    <Tabs.Trigger
      value={tab.id}
      className={`min-h-11 grow basis-0 cursor-pointer rounded-xl border border-white/12 bg-white/4 px-1.5 text-xs font-bold tracking-[0.02em] text-secondary transition-colors hover:bg-white/8 data-[state=active]:border-white/92 data-[state=active]:bg-white/92 data-[state=active]:text-ink ${FOCUS_RING_CLASS_NAME}`}
    >
      {tab.label}
    </Tabs.Trigger>
  );
}

function Panel({ value, children }: { value: GameTabId; children: ReactNode }) {
  return (
    <Tabs.Content value={value} forceMount className={PANEL_CLASS_NAME}>
      {children}
    </Tabs.Content>
  );
}

// A grid of one keeps the section stretched to its slot, so the cards of the top row align top and bottom.
function Slot({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={`grid min-w-0 gap-3 md:gap-6 ${className}`}>{children}</div>
  );
}

type GameSectionsProps = {
  tabs: GameTabs;
  onSelectTab: (tab: GameTab) => void;
  highlights: ReactNode;
  leaders: ReactNode;
  gameFlow: ReactNode;
  boxScore: ReactNode;
  teamStats: ReactNode;
  plays: ReactNode;
};

// Mobile shows the sections under tabs, as in the GameDetail artboard; desktop lays them all out on one page,
// as in the GameDetailDesktop artboard: highlights beside a side column of leaders and team stats, then full-width rows.
export function GameSections({
  tabs,
  onSelectTab,
  highlights,
  leaders,
  gameFlow,
  boxScore,
  teamStats,
  plays,
}: GameSectionsProps) {
  const selectTab = (tabId: string) => {
    const tab = tabs.items.find(({ id }) => id === tabId);
    if (tab) onSelectTab(tab);
  };

  return (
    <Tabs.Root
      value={tabs.selected}
      onValueChange={selectTab}
      className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] md:grid-rows-[auto_1fr] md:gap-6"
    >
      <Tabs.List
        aria-label={strings.game.tabs.label}
        className="flex gap-1.5 md:hidden"
      >
        {tabs.items.map((tab) => (
          <TabTrigger key={tab.id} tab={tab} />
        ))}
      </Tabs.List>
      <Panel value="summary">
        <Slot className="md:col-start-1 md:row-span-2 md:row-start-1">
          {highlights}
        </Slot>
        <Slot className="-order-1 md:order-none md:col-start-2 md:row-start-1">
          {leaders}
        </Slot>
        <Slot className="-order-2 md:order-none md:col-span-2 md:row-start-3">
          {gameFlow}
        </Slot>
      </Panel>
      <Panel value="box">
        <Slot className="md:col-span-2 md:row-start-4">{boxScore}</Slot>
      </Panel>
      <Panel value="stats">
        <Slot className="md:col-start-2 md:row-start-2">{teamStats}</Slot>
      </Panel>
      <Panel value="plays">
        <Slot className="md:col-span-2 md:row-start-5">{plays}</Slot>
      </Panel>
    </Tabs.Root>
  );
}
