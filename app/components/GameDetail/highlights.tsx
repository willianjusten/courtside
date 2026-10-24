"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { FOCUS_RING_CLASS_NAME } from "@/app/components/DatePicker/DatePickerTrigger";
import type { HighlightVideo, HighlightsView } from "@/app/lib/game/game-view";
import { useIsDesktop } from "@/app/lib/layout/use-is-desktop";
import { strings } from "@/app/lib/strings";
import { ChevronIcon } from "./chevron-icon";
import { PlayIcon } from "./play-icon";
import { Section } from "./sections";
import { VIDEO_FRAME_CLASS_NAME } from "./styles";

const HEADING_ID = "game-highlights";
const LIST_ID = "game-highlights-list";
// The artboards list three videos on mobile and four on desktop until the list is expanded.
const COLLAPSED_VIDEO_COUNT = { mobile: 3, desktop: 4 };

// The player loads on demand, so the game center's first load doesn't carry it.
const VideoPlayer = dynamic(
  () => import("./video-player").then(({ VideoPlayer }) => VideoPlayer),
  {
    ssr: false,
    loading: () => <div className={VIDEO_FRAME_CLASS_NAME} />,
  },
);

function VideoItem({
  video,
  isSelected,
  onPick,
}: {
  video: HighlightVideo;
  isSelected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={isSelected ? "true" : undefined}
      onClick={onPick}
      className={`flex min-h-[52px] w-full cursor-pointer items-start gap-2.5 rounded-[10px] p-2.5 text-left transition-colors md:min-h-14 md:gap-3 md:p-3 ${isSelected ? "bg-white/6" : "hover:bg-white/4"} ${FOCUS_RING_CLASS_NAME}`}
    >
      <PlayIcon className="mt-[3px] size-3 shrink-0 md:size-3.5" />
      <span className="flex min-w-0 flex-col gap-[3px] md:gap-1">
        <span
          className={`text-[13px] leading-[1.35] font-bold md:text-sm ${isSelected ? "text-link" : "text-foreground"}`}
        >
          {video.title}
        </span>
        <span className="text-[11px] text-muted md:text-xs">
          {video.durationLabel}
        </span>
      </span>
    </button>
  );
}

// One player and a clickable list, as in the GameDetail and GameDetailDesktop artboards:
// the list sits under the player on mobile and beside it on desktop.
export function Highlights({ highlights }: { highlights: HighlightsView }) {
  const isDesktop = useIsDesktop();
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [playRequest, setPlayRequest] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Kept across refetches, falling back to the first video when ESPN no longer lists the selected one.
  const selectedVideo =
    highlights.videos.find(({ id }) => id === selectedVideoId) ??
    highlights.videos[0];
  const collapsedVideoCount = isDesktop
    ? COLLAPSED_VIDEO_COUNT.desktop
    : COLLAPSED_VIDEO_COUNT.mobile;
  const isCollapsible = highlights.videos.length > collapsedVideoCount;
  const visibleVideos =
    isCollapsible && !isExpanded
      ? highlights.videos.slice(0, collapsedVideoCount)
      : highlights.videos;

  const pickVideo = ({ id }: HighlightVideo) => {
    setSelectedVideoId(id);
    setPlayRequest((request) => request + 1);
  };

  return (
    <Section
      headingId={HEADING_ID}
      title={strings.game.highlights.title}
      action={
        <span className="text-[11px] font-medium text-muted md:text-xs">
          {highlights.countLabel}
        </span>
      }
    >
      <div className="flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-start md:gap-5">
        <div className="flex min-w-0 flex-col gap-2.5 md:flex-[999_1_520px]">
          <VideoPlayer video={selectedVideo} playRequest={playRequest} />
          <div className="flex flex-col gap-0.5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-4 md:gap-y-2">
            <p className="text-sm leading-[1.35] font-bold md:text-[15px]">
              {selectedVideo.title}
            </p>
            {selectedVideo.espnUrl && (
              <a
                href={selectedVideo.espnUrl}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex min-h-11 items-center self-start text-xs font-bold text-link transition-colors hover:text-accent md:self-auto md:text-[13px] ${FOCUS_RING_CLASS_NAME}`}
              >
                {strings.game.highlights.watchOnEspn}
              </a>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2.5 md:flex-[1_1_300px] md:gap-2">
          <ul
            id={LIST_ID}
            aria-label={strings.game.highlights.videos}
            className="flex flex-col gap-0.5 border-t border-white/8 pt-1.5 md:border-0 md:pt-0"
          >
            {visibleVideos.map((video) => (
              <li key={video.id}>
                <VideoItem
                  video={video}
                  isSelected={video.id === selectedVideo.id}
                  onPick={() => pickVideo(video)}
                />
              </li>
            ))}
          </ul>
          {isCollapsible && (
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={LIST_ID}
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 text-[13px] font-bold text-accent-soft transition-colors hover:bg-accent/16 ${FOCUS_RING_CLASS_NAME}`}
            >
              {isExpanded
                ? strings.game.highlights.viewLess
                : strings.game.highlights.viewMore}
              <ChevronIcon isExpanded={isExpanded} />
            </button>
          )}
        </div>
      </div>
    </Section>
  );
}
