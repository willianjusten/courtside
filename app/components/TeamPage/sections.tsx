"use client";

import * as Tabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";
import { FOCUS_RING_CLASS_NAME } from "@/app/components/DatePicker/DatePickerTrigger";
import { strings } from "@/app/lib/strings";
import type { TeamTab, TeamTabId, TeamTabs } from "@/app/lib/team/team-view";

// Every panel stays mounted: on mobile the inactive ones are hidden, and from md up the panels dissolve
// (display: contents) so their sections are placed straight on the column grid.
// Radix puts each panel in the tab order, so on mobile it shows the shared focus ring.
const PANEL_CLASS_NAME = `flex flex-col gap-3 rounded-xl data-[state=inactive]:hidden md:contents md:data-[state=inactive]:contents ${FOCUS_RING_CLASS_NAME}`;

function TabTrigger({ tab }: { tab: TeamTab }) {
  return (
    <Tabs.Trigger
      value={tab.id}
      className={`min-h-11 grow basis-0 cursor-pointer rounded-xl border border-white/12 bg-white/4 px-2 text-xs font-bold tracking-[0.02em] text-secondary transition-colors hover:bg-white/8 data-[state=active]:border-white/92 data-[state=active]:bg-white/92 data-[state=active]:text-ink ${FOCUS_RING_CLASS_NAME}`}
    >
      {tab.label}
    </Tabs.Trigger>
  );
}

function Panel({
  value,
  className,
  children,
}: {
  value: TeamTabId;
  className: string;
  children: ReactNode;
}) {
  return (
    <Tabs.Content value={value} forceMount className={PANEL_CLASS_NAME}>
      <div className={`flex min-w-0 flex-col gap-3 ${className}`}>
        {children}
      </div>
    </Tabs.Content>
  );
}

type TeamSectionsProps = {
  tabs: TeamTabs;
  onSelectTab: (tab: TeamTab) => void;
  schedule: ReactNode;
  roster: ReactNode;
};

// Mobile shows the sections under tabs, as in the TeamPage artboard; desktop lays them out in columns,
// as in the TeamPageDesktop artboard: the schedule beside a side column with the roster.
// The side column always fits the whole roster table, so it never scrolls sideways; the schedule takes the narrower share.
export function TeamSections({
  tabs,
  onSelectTab,
  schedule,
  roster,
}: TeamSectionsProps) {
  const selectTab = (tabId: string) => {
    const tab = tabs.items.find(({ id }) => id === tabId);
    if (tab) onSelectTab(tab);
  };

  return (
    <Tabs.Root
      value={tabs.selected}
      onValueChange={selectTab}
      className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_420px] md:items-start md:gap-6 lg:grid-cols-[minmax(0,1fr)_460px]"
    >
      <Tabs.List
        aria-label={strings.team.tabs.label}
        className="flex gap-1.5 md:hidden"
      >
        {tabs.items.map((tab) => (
          <TabTrigger key={tab.id} tab={tab} />
        ))}
      </Tabs.List>
      <Panel value="schedule" className="md:col-start-1">
        {schedule}
      </Panel>
      <Panel value="roster" className="md:col-start-2 md:row-start-1">
        {roster}
      </Panel>
    </Tabs.Root>
  );
}
