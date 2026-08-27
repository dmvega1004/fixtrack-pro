"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/connectivity/store";

/**
 * true cuando NO hay conectividad observada — ver lib/connectivity/store
 * para de dónde sale ese hecho (nunca solo navigator.onLine).
 */
export function useOnlineStatus(): boolean {
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return !isOffline;
}
