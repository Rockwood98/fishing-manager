"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type WeatherState = {
  temperature: number;
  windSpeed: number;
  pressure: number;
  precipitation: number;
};

type ForecastDay = {
  date: string;
  score: number;
  level: "slabe" | "srednie" | "dobre" | "bardzo_dobre";
  reason: string;
};

type UiState =
  | { status: "idle" | "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; weather: WeatherState; today: ForecastDay; nextDays: ForecastDay[] };

function levelLabel(level: ForecastDay["level"]) {
  if (level === "bardzo_dobre") return "Bardzo dobre";
  if (level === "dobre") return "Dobre";
  if (level === "srednie") return "Srednie";
  return "Slabe";
}

function levelClass(level: ForecastDay["level"]) {
  if (level === "bardzo_dobre") return "text-emerald-700";
  if (level === "dobre") return "text-lime-700";
  if (level === "srednie") return "text-amber-700";
  return "text-rose-700";
}

function shortDate(isoDate: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(new Date(isoDate));
}

export function CurrentLocationWeatherCard() {
  const [state, setState] = useState<UiState>({ status: "idle" });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState({ status: "error", message: "Przegladarka nie obsluguje geolokalizacji." });
      return;
    }

    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(`/api/fishing/forecast?lat=${lat}&lon=${lon}&days=5`, {
            cache: "no-store",
          });
          if (!res.ok) throw new Error("Blad pobierania pogody");
          const payload = (await res.json()) as {
            data: {
              current: WeatherState;
              today: ForecastDay;
              nextDays: ForecastDay[];
            };
          };

          setState({
            status: "ready",
            weather: payload.data.current,
            today: payload.data.today,
            nextDays: payload.data.nextDays,
          });
        } catch {
          setState({ status: "error", message: "Nie udalo sie pobrac aktualnej pogody." });
        }
      },
      () => setState({ status: "error", message: "Brak zgody na lokalizacje." }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 },
    );
  }, []);

  const weather = state.status === "ready" ? state.weather : null;
  const today = state.status === "ready" ? state.today : null;
  const nextDays = state.status === "ready" ? state.nextDays : [];

  return (
    <Card className="bg-white/90 p-2">
      <p className="text-xs text-zinc-500">Pogoda i kalendarz bran</p>
      {state.status === "loading" || state.status === "idle" ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
          <Spinner className="size-3.5" />
          <span>Pobieranie pogody...</span>
        </div>
      ) : state.status === "error" ? (
        <p className="mt-2 text-[11px] text-zinc-600">{state.message}</p>
      ) : weather ? (
        <>
          <p className="mt-0.5 text-xs font-semibold text-sky-700">
            {Math.round(weather.temperature)} C, wiatr {Math.round(weather.windSpeed)} km/h
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">
            Cisnienie: {Math.round(weather.pressure)} hPa
          </p>
          {today ? (
            <>
              <p className={`mt-1 text-[11px] font-semibold ${levelClass(today.level)}`}>
                Dzisiaj: {levelLabel(today.level)} ({today.score}/100)
              </p>
              <p className="text-[11px] text-zinc-600">{today.reason}</p>
            </>
          ) : null}
          {nextDays.length ? (
            <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px]">
              {nextDays.slice(0, 4).map((day) => (
                <div key={day.date} className="rounded-md bg-zinc-100 px-1.5 py-1">
                  <p className="text-zinc-600">{shortDate(day.date)}</p>
                  <p className={`font-semibold ${levelClass(day.level)}`}>{levelLabel(day.level)}</p>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-[11px] text-zinc-600">Brak danych pogodowych.</p>
      )}
    </Card>
  );
}
