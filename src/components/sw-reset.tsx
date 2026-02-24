"use client";

import { useEffect } from "react";

export function ServiceWorkerReset() {
  useEffect(() => {
    async function reset() {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator)) return;

      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      } catch {
        // Ignore, we only try to stabilize clients with old SW.
      }

      try {
        if (!("caches" in window)) return;
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // Ignore cache deletion errors.
      }
    }

    void reset();
  }, []);

  return null;
}
