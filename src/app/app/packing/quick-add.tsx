"use client";

import { useMemo, useRef, useState } from "react";
import { PACKING_CATEGORIES, getCategoryIcon } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Suggestion = {
  id: string;
  name: string;
  category: string;
  icon?: string | null;
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
  const [icon, setIcon] = useState<string>(getCategoryIcon("Inne"));
  const [catalogId, setCatalogId] = useState("");
  const categoryIcon = useMemo(() => getCategoryIcon(category), [category]);
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
        formData.set("icon", icon || categoryIcon);
        if (catalogId) formData.set("catalogItemId", catalogId);
        await onSubmit(formData);
        setQuery("");
        setItems([]);
        setCatalogId("");
        setCategory("Inne");
        setIcon(getCategoryIcon("Inne"));
      }}
      className="space-y-2"
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_170px_90px_auto]">
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
                    setIcon(s.icon || getCategoryIcon(s.category));
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
            if (!icon.trim() || icon === getCategoryIcon(category)) {
              setIcon(getCategoryIcon(e.target.value));
            }
          }}
          className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
        >
          {PACKING_CATEGORIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
        <Input
          name="iconUi"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="Ikona"
          maxLength={4}
        />
        <Button type="submit">Dodaj</Button>
      </div>
    </form>
  );
}
