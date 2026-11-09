"use client";

import { useIsClient } from "@/lib/use-is-client";

// Null on the server and on the first client render, which don't know the viewer's timezone.
export function useBrowserTimeZone(): string | null {
  const isClient = useIsClient();
  return isClient ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
}
