"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Weather = {
  current: {
    temperature: number;
    windSpeed: number;
    pressure: number;
    precipitation: number;
    time: string;
  };
  daily: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    windMax: number;
    precipitationSum: number;
  }>;
  hourly: Array<{
    time: string;
    temperature: number;
    windSpeed: number;
    precipitation: number;
    pressure: number;
  }>;
};

function normalizeWeather(input: Weather | null | undefined): Weather | null {
  if (!input) return null;
  const safeDaily = Array.isArray((input as { daily?: unknown }).daily)
    ? input.daily
    : [];
  const safeHourly = Array.isArray((input as { hourly?: unknown }).hourly)
    ? input.hourly
    : [];
  return {
    current: input.current,
    daily: safeDaily,
    hourly: safeHourly,
  };
}

export function WeatherPanel({ tripId, cached }: { tripId: string; cached?: Weather | null }) {
  const [weather, setWeather] = useState<Weather | null>(normalizeWeather(cached));
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const bootstrappedRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/weather?tripId=${tripId}`);
    const json = await res.json();
    setLoading(false);
    if (json.data) setWeather(normalizeWeather(json.data));
  }, [tripId]);

  const dayHours = useMemo(() => {
    if (!weather || !selectedDate) return [];
    return weather.hourly.filter((h) => h.time.startsWith(selectedDate));
  }, [weather, selectedDate]);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    if (weather?.daily?.length) return;
    bootstrappedRef.current = true;
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [weather, refresh]);

  return (
    <div className="rounded-xl border border-zinc-200 p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Pogoda na czas wyjazdu</h3>
        <Button variant="secondary" onClick={refresh} disabled={loading}>
          {loading ? "Odswiezanie..." : "Odswiez"}
        </Button>
      </div>
      {weather ? (
        <div className="mt-3 text-sm">
          <p>
            Teraz: {weather.current.temperature}°C, wiatr {weather.current.windSpeed} km/h,
            cisnienie {Math.round(weather.current.pressure)} hPa
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {weather.daily.map((d) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelectedDate(d.date)}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-left hover:bg-sky-50"
              >
                <p className="font-medium">{d.date}</p>
                <p>Temp: {d.tempMin}° - {d.tempMax}°</p>
                <p>Wiatr max: {d.windMax} km/h</p>
                <p>Opad: {d.precipitationSum} mm</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">Brak danych. Kliknij Odswiez.</p>
      )}

      {selectedDate ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4">
          <div className="mx-auto mt-10 max-w-xl rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold">Godzinowa prognoza: {selectedDate}</h4>
              <Button variant="ghost" onClick={() => setSelectedDate(null)}>
                Zamknij
              </Button>
            </div>
            <div className="max-h-[60vh] space-y-1 overflow-auto text-sm">
            {dayHours.map((h) => (
                <div key={h.time} className="grid grid-cols-5 rounded-md bg-zinc-50 px-2 py-1">
                  <span>{h.time.slice(11, 16)}</span>
                  <span>{h.temperature}°C</span>
                  <span>{h.windSpeed} km/h</span>
                  <span>{h.precipitation} mm</span>
                  <span>{Math.round(h.pressure)} hPa</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
