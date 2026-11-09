"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { FOCUS_RING_CLASS_NAME } from "@/features/scoreboard/components/DatePicker/DatePickerTrigger";
import TeamLogo from "@/components/TeamLogo";
import type { PlayByPlayView, PlayRow } from "@/features/game/game-view";
import { useIsDesktop } from "@/lib/use-is-desktop";
import { strings } from "@/lib/strings";
import { ChevronIcon } from "./chevron-icon";
import { Section } from "./sections";
import { ToggleGroup, type ToggleOption } from "./toggle-group";

const HEADING_ID = "game-plays";
const LIST_ID = "game-plays-list";
const LOGO_SIZE = 24;
// The desktop artboard previews the six most recent plays until the feed is expanded.
const COLLAPSED_PLAY_COUNT = 6;
const ALL_PERIODS = "all";

type PeriodFilter = number | typeof ALL_PERIODS;

type FeedSnapshot = {
  feedKey: string;
  newestPlayId: string;
};

const documentTopOf = (element: Element) =>
  element.getBoundingClientRect().top + window.scrollY;

// New plays land on top of the feed. When the fan is reading inside it, the page scrolls by the height they add,
// so the rows being read stay put. The height is measured inside the list, so shifts above the feed don't count,
// and the target is absolute, so a browser that already anchored the scroll is left as is.
function useKeepReadingPosition(
  listRef: RefObject<HTMLOListElement | null>,
  feedKey: string,
  newestPlayId: string | undefined,
  isEnabled: boolean,
) {
  const snapshotRef = useRef<FeedSnapshot | null>(null);
  // The scroll position before the commit, which the browser's own anchoring may already have moved.
  const scrollYRef = useRef(0);

  useLayoutEffect(() => {
    const updateScrollY = () => {
      scrollYRef.current = window.scrollY;
    };
    updateScrollY();
    window.addEventListener("scroll", updateScrollY, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollY);
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    const previous = snapshotRef.current;
    if (
      isEnabled &&
      list &&
      previous &&
      previous.feedKey === feedKey &&
      previous.newestPlayId !== newestPlayId
    ) {
      const previousNewestRow = list.querySelector(
        `[data-play-id="${CSS.escape(previous.newestPlayId)}"]`,
      );
      const scrollYBefore = scrollYRef.current;
      const listTop = documentTopOf(list);
      const listBottom = list.getBoundingClientRect().bottom + window.scrollY;
      const isReadingFeed =
        listTop < scrollYBefore && scrollYBefore < listBottom;
      if (previousNewestRow && isReadingFeed) {
        // The previous newest play was the first row, so its offset in the list is the height the new plays add.
        const addedHeight = documentTopOf(previousNewestRow) - listTop;
        window.scrollTo(window.scrollX, scrollYBefore + addedHeight);
      }
    }

    snapshotRef.current = newestPlayId ? { feedKey, newestPlayId } : null;
  }, [listRef, feedKey, newestPlayId, isEnabled]);
}

function PlayItem({ play }: { play: PlayRow }) {
  return (
    <li
      data-play-id={play.id}
      // Mobile rows are split by rules, as in the GameDetail artboard; desktop highlights the scoring rows instead.
      className={`grid grid-cols-[56px_24px_minmax(0,1fr)_52px] items-center gap-2 border-t border-white/6 py-2 md:grid-cols-[80px_24px_minmax(0,1fr)_72px] md:gap-3 md:rounded-[10px] md:border-0 md:px-3 md:py-3.5 ${play.isScoring ? "md:bg-white/5" : ""}`}
    >
      <span className="text-[11px] whitespace-nowrap text-muted tabular-nums md:text-[13px]">
        {play.periodLabel} {play.clock}
      </span>
      {play.team ? (
        <TeamLogo
          logoUrl={play.team.logoUrl}
          size={LOGO_SIZE}
          alt={play.team.name}
          lazy
        />
      ) : (
        <span aria-hidden="true" />
      )}
      {play.isScoring ? (
        <strong className="text-xs leading-[1.35] font-bold text-foreground md:text-sm md:leading-[1.4] md:font-normal">
          {play.text}
        </strong>
      ) : (
        <span className="text-xs leading-[1.35] text-muted md:text-sm md:leading-[1.4] md:text-foreground">
          {play.text}
        </span>
      )}
      <span className="text-right font-display text-[15px] whitespace-nowrap text-secondary tabular-nums md:font-sans md:text-sm md:text-foreground">
        {play.score}
      </span>
    </li>
  );
}

export function PlayByPlay({ playByPlay }: { playByPlay: PlayByPlayView }) {
  const isDesktop = useIsDesktop();
  // Kept across refetches, so a live game updates the picked period and the expanded feed in place.
  const [selectedPeriod, setSelectedPeriod] =
    useState<PeriodFilter>(ALL_PERIODS);
  const [isExpanded, setIsExpanded] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  const filteredPlays =
    selectedPeriod === ALL_PERIODS
      ? playByPlay.plays
      : (playByPlay.periods.find(({ period }) => period === selectedPeriod)
          ?.plays ?? playByPlay.plays);
  const isCollapsible =
    isDesktop && filteredPlays.length > COLLAPSED_PLAY_COUNT;
  const visiblePlays =
    isCollapsible && !isExpanded
      ? filteredPlays.slice(0, COLLAPSED_PLAY_COUNT)
      : filteredPlays;

  // The collapsed desktop preview keeps its height, so new plays don't push the rows below it.
  useKeepReadingPosition(
    listRef,
    String(selectedPeriod),
    visiblePlays[0]?.id,
    visiblePlays.length === filteredPlays.length,
  );

  const selectPeriod = (period: PeriodFilter) => {
    setSelectedPeriod(period);
    setIsExpanded(false);
  };

  const periodOptions: ToggleOption<PeriodFilter>[] = [
    { value: ALL_PERIODS, label: strings.game.plays.allPeriods },
    ...playByPlay.periods.map(({ period, label }) => ({
      value: period,
      label,
    })),
  ];

  return (
    <Section
      headingId={HEADING_ID}
      title={strings.game.plays.title}
      action={
        playByPlay.plays.length > 0 && (
          <span className="text-[11px] font-medium text-muted md:text-xs">
            <span className="md:hidden">{strings.game.plays.newestFirst}</span>
            <span className="hidden md:inline">
              {strings.game.plays.summary(playByPlay.plays.length)}
            </span>
          </span>
        )
      }
    >
      {playByPlay.plays.length === 0 ? (
        <p className="text-sm text-muted">{strings.game.plays.empty}</p>
      ) : (
        <>
          <ToggleGroup
            label={strings.game.plays.periodFilter}
            options={periodOptions}
            selectedValue={selectedPeriod}
            onSelect={selectPeriod}
          />
          <ol
            id={LIST_ID}
            ref={listRef}
            className="flex flex-col md:-mx-0.5 md:gap-1"
          >
            {visiblePlays.map((play) => (
              <PlayItem key={play.id} play={play} />
            ))}
          </ol>
          {isCollapsible && (
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={LIST_ID}
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/4 text-[13px] font-bold text-secondary transition-colors hover:bg-white/8 ${FOCUS_RING_CLASS_NAME}`}
            >
              {isExpanded
                ? strings.game.plays.showFewer
                : strings.game.plays.showAll(filteredPlays.length)}
              <ChevronIcon isExpanded={isExpanded} />
            </button>
          )}
        </>
      )}
    </Section>
  );
}
