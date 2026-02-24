"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export function PackingTripPicker({
  trips,
  selectedTripId,
}: {
  trips: Array<{ id: string; title: string }>;
  selectedTripId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-w-56 items-center gap-2">
      <select
        value={selectedTripId}
        disabled={pending}
        onChange={(e) => {
          const sp = new URLSearchParams(params.toString());
          sp.set("tripId", e.target.value);
          startTransition(() => {
            router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
          });
        }}
        className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm"
      >
        {trips.map((trip) => (
          <option key={trip.id} value={trip.id}>
            {trip.title}
          </option>
        ))}
      </select>
      {pending ? <span className="text-xs text-zinc-500">...</span> : null}
    </div>
  );
}
