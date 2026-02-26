"use client";

import { useRef, useState } from "react";
import { PACKING_CATEGORIES, getCategoryIcon } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Suggestion = {
  id: string;
  name: string;
  category: string;
  icon?: string | null;
  needType?: "TO_BUY" | "TO_TAKE";
};

export function QuickAdd({
  tripId,
  onSubmit,
}: {
  tripId: string;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [category, setCategory] = useState("Inne");
  const [needType, setNeedType] = useState<"TO_BUY" | "TO_TAKE">("TO_TAKE");
  const [catalogId, setCatalogId] = useState("");
  const requestSeqRef = useRef(0);

  async function load(q: string) {
    setQuery(q);
    const trimmed = q.trim();
    if (!trimmed) {
      setCatalogId("");
      setItems([]);
      return;
    }

    // Bugfix: filtrowanie musi startowac z pelnej listy zrodla dla kazdego zapytania,
    // a nie z poprzednio przefiltrowanych suggestions (unikamy "starych" wynikow).
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    const res = await fetch(`/api/packing/suggestions?q=${encodeURIComponent(trimmed)}`);
    const json = await res.json();
    if (seq !== requestSeqRef.current) {
      return;
    }
    setItems(json.items ?? []);
  }

  return (
    <form
      action={async (formData) => {
        formData.set("tripId", tripId);
        formData.set("category", category);
        formData.set("needType", needType);
        if (catalogId) formData.set("catalogItemId", catalogId);
        await onSubmit(formData);
        setQuery("");
        setItems([]);
        setCatalogId("");
        setCategory("Inne");
        setNeedType("TO_TAKE");
      }}
      className="space-y-2"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_170px_auto]">
        <div className="min-w-0">
          <Input
            name="name"
            placeholder="Dodaj rzecz i Enter"
            value={query}
            onChange={(e) => load(e.target.value)}
            onFocus={() => {
              if (query.trim()) load(query);
            }}
            required
          />
          {query.trim() && items.length ? (
            <div className="mt-1 rounded-xl border border-zinc-200 bg-white p-2 text-sm">
              {items.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className="flex w-full rounded-md px-2 py-1 text-left hover:bg-zinc-50"
                  onClick={() => {
                    setQuery(s.name);
                    setCategory(s.category);
                    setNeedType(s.needType === "TO_BUY" ? "TO_BUY" : "TO_TAKE");
                    setCatalogId(s.id);
                    setItems([]);
                  }}
                >
                  <span className="mr-2">{s.icon || getCategoryIcon(s.category)}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
          }}
          className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
        >
          {PACKING_CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <Button type="submit">Dodaj</Button>
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={needType === "TO_BUY"}
          onChange={(e) => setNeedType(e.target.checked ? "TO_BUY" : "TO_TAKE")}
          className="size-4 rounded border-zinc-300"
        />
        To jest artykul do kupienia
      </label>
      <p className="text-xs text-zinc-500">
        Typ pozycji: {needType === "TO_BUY" ? "Do kupienia" : "Do zabrania"}.
      </p>
    </form>
  );
}
