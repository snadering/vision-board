"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Media query as an external store, so the value is read during render rather
 * than synced into state by an effect.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // On the server nothing is known about the viewport; the board waits for a
    // measured width before it places anything anyway.
    () => false,
  );
}
