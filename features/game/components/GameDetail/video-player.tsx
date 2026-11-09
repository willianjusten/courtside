"use client";

import { useEffect, useRef, useState } from "react";
import { FOCUS_RING_CLASS_NAME } from "@/features/scoreboard/components/DatePicker/DatePickerTrigger";
import type { HighlightVideo } from "@/features/game/game-view";
import { PlayIcon } from "./play-icon";
import { VIDEO_FRAME_CLASS_NAME } from "./styles";

// A browser that blocks playback leaves the play button up, so the fan can start it by hand.
function play(video: HTMLVideoElement | null) {
  video?.play().catch(() => {});
}

// One native video element for every highlight: picking another video swaps its source.
export function VideoPlayer({
  video,
  playRequest,
}: {
  video: HighlightVideo;
  // Bumped each time the fan picks a video from the list, which plays it right away.
  playRequest: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The artboards' play button and duration cover the poster until the first play, then the native controls take over.
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (playRequest > 0) play(videoRef.current);
  }, [playRequest]);

  return (
    <div className={VIDEO_FRAME_CLASS_NAME}>
      <video
        ref={videoRef}
        src={video.sourceUrl}
        poster={video.thumbnailUrl ?? undefined}
        preload="none"
        playsInline
        controls={hasStarted}
        aria-label={video.title}
        onPlay={() => setHasStarted(true)}
        className="size-full bg-black object-contain"
      />
      {!hasStarted && (
        <>
          <button
            type="button"
            aria-label={video.playLabel}
            onClick={() => play(videoRef.current)}
            className={`absolute inset-0 m-auto flex size-14 cursor-pointer items-center justify-center rounded-full bg-white/92 text-ink transition-colors hover:bg-white md:size-[76px] ${FOCUS_RING_CLASS_NAME}`}
          >
            <PlayIcon className="size-6 md:size-[30px]" />
          </button>
          <span className="absolute bottom-2.5 left-2.5 rounded-[7px] bg-ink/80 px-2 py-1 text-[11px] md:bottom-3.5 md:left-4 md:rounded-lg md:px-2.5 md:py-[5px] md:text-xs">
            {video.durationLabel}
          </span>
        </>
      )}
    </div>
  );
}
