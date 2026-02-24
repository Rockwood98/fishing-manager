"use client";

import { addMonths, format, parse } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type ViewMode = "list" | "week" | "month";

function parseMonthCursor(cursor: string) {
  const parsed = parse(`${cursor}-01`, "yyyy-MM-dd", new Date());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function TripsControls({
  currentView,
  currentMonth,
}: {
  currentView: ViewMode;
  currentMonth: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const monthDate = parseMonthCursor(currentMonth);

  function navigate(nextView: ViewMode, nextMonth = currentMonth) {
    const sp = new URLSearchParams(params.toString());
    sp.set("view", nextView);
    if (nextView === "month") sp.set("month", nextMonth);
    else sp.delete("month");
    startTransition(() => {
      router.replace(`${pathname}?${sp.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-sm ${currentView === "month" ? "bg-sky-100 text-sky-700" : "bg-zinc-100"}`}
          onClick={() => navigate("month", currentMonth)}
          disabled={pending}
        >
          Miesiac
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-sm ${currentView === "week" ? "bg-sky-100 text-sky-700" : "bg-zinc-100"}`}
          onClick={() => navigate("week")}
          disabled={pending}
        >
          Tydzien
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1 text-sm ${currentView === "list" ? "bg-sky-100 text-sky-700" : "bg-zinc-100"}`}
          onClick={() => navigate("list")}
          disabled={pending}
        >
          Lista
        </button>
      </div>

      {currentView === "month" ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("month", format(addMonths(monthDate, -1), "yyyy-MM"))}
            disabled={pending}
            className="rounded-lg border border-zinc-200 px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-60"
          >
            ← Poprzedni
          </button>
          <span className="text-xs text-zinc-500">{pending ? "Ladowanie..." : " "}</span>
          <button
            type="button"
            onClick={() => navigate("month", format(addMonths(monthDate, 1), "yyyy-MM"))}
            disabled={pending}
            className="rounded-lg border border-zinc-200 px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-60"
          >
            Nastepny →
          </button>
        </div>
      ) : null}
    </div>
  );
}
