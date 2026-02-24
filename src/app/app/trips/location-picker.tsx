"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Place = {
  id: number;
  label: string;
  lat: number;
  lon: number;
};

export function LocationPicker() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  async function searchPlaces(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setItems([]);
      return;
    }
    const res = await fetch(`/api/locations/search?q=${encodeURIComponent(value)}`);
    const json = await res.json();
    setItems(json.items ?? []);
  }

  return (
    <div className="space-y-2 md:col-span-3">
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <Input
          value={query}
          onChange={(e) => searchPlaces(e.target.value)}
          placeholder="Szukaj miejsca (np. Zegrze, Wisla, PZW)"
          name="locationName"
          required
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setSelected(null);
            setLat("");
            setLon("");
          }}
        >
          Wpisz recznie
        </Button>
      </div>
      {items.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelected(item);
                setQuery(item.label);
                setLat(item.lat.toFixed(6));
                setLon(item.lon.toFixed(6));
                setItems([]);
              }}
              className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-zinc-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          name="latitude"
          placeholder="Szerokosc (lat)"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          required
        />
        <Input
          name="longitude"
          placeholder="Dlugosc (lon)"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
          required
        />
      </div>
      {selected ? (
        <p className="text-xs text-zinc-500">
          Wybrane: {selected.label}
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Mozesz wybrac z podpowiedzi albo wpisac recznie wspolrzedne.
        </p>
      )}
    </div>
  );
}
