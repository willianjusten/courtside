"use client";

import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};
const isClientRender = () => true;
const isServerRender = () => false;

// False on the server and on the client render that hydrates its markup, so anything that differs per viewer waits for the next render.
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    isClientRender,
    isServerRender,
  );
}
