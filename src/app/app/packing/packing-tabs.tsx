"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Spinner } from "@/components/ui/spinner";

type Tab = "all" | "buy" | "take";

export function PackingTabs({
  activeTab,
  tripId,
}: {
  activeTab: Tab;
  tripId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function switchTab(tab: Tab) {
    const next = new URLSearchParams(params.toString());
    next.set("tripId", tripId);
    if (tab === "all") next.delete("tab");
    else next.set("tab", tab);
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => switchTab("all")}
        disabled={pending}
        className={`rounded-lg px-3 py-1 text-sm ${
          activeTab === "all" ? "bg-sky-100 text-sky-700" : "bg-zinc-100 text-zinc-700"
        } ${pending ? "opacity-70" : ""}`}
      >
        Wszystkie
      </button>
      <button
        type="button"
        onClick={() => switchTab("buy")}
        disabled={pending}
        className={`rounded-lg px-3 py-1 text-sm ${
          activeTab === "buy" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-700"
        } ${pending ? "opacity-70" : ""}`}
      >
        Do kupienia
      </button>
      <button
        type="button"
        onClick={() => switchTab("take")}
        disabled={pending}
        className={`rounded-lg px-3 py-1 text-sm ${
          activeTab === "take" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-700"
        } ${pending ? "opacity-70" : ""}`}
      >
        Do zabrania
      </button>
      {pending ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
          <Spinner className="size-3 text-sky-700" />
          Ladowanie
        </span>
      ) : null}
    </div>
  );
}
