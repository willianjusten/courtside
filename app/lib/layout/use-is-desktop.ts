"use client";

import { useSyncExternalStore } from "react";

// Tailwind's md breakpoint, where the desktop layout starts.
const DESKTOP_MEDIA_QUERY = "(min-width: 48rem)";

function subscribeToDesktop(onChange: () => void) {
  const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

const isDesktopViewport = () => window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
// The server, and the first client render that hydrates its markup, don't know the viewport.
const unknownViewport = () => false;

export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeToDesktop,
    isDesktopViewport,
    unknownViewport,
  );
}
