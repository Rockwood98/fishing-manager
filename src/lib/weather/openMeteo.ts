import { format } from "date-fns";

export type WeatherSnapshot = {
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
    weatherCode?: number;
  }>;
  hourly: Array<{
    time: string;
    temperature: number;
    windSpeed: number;
    precipitation: number;
    pressure: number;
  }>;
};

export async function fetchOpenMeteoWeather(
  lat: number,
  lon: number,
  startsAt: Date,
  endsAt: Date,
) {
  const startDate = format(startsAt, "yyyy-MM-dd");
  const endDate = format(endsAt, "yyyy-MM-dd");

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("timezone", "Europe/Warsaw");
  url.searchParams.set(
    "hourly",
    "temperature_2m,wind_speed_10m,precipitation,surface_pressure",
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code",
  );
  url.searchParams.set(
    "current",
    "temperature_2m,wind_speed_10m,precipitation,surface_pressure",
  );
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);

  const res = await fetch(url.toString(), { next: { revalidate: 900 } });
  if (!res.ok) throw new Error("Blad pobierania pogody");
  const data = await res.json();

  const snapshot: WeatherSnapshot = {
    current: {
      temperature: data.current.temperature_2m,
      windSpeed: data.current.wind_speed_10m,
      pressure: data.current.surface_pressure,
      precipitation: data.current.precipitation,
      time: data.current.time,
    },
    daily: data.daily.time.map((date: string, i: number) => ({
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipitationSum: data.daily.precipitation_sum[i],
      windMax: data.daily.wind_speed_10m_max[i],
      weatherCode: data.daily.weather_code?.[i],
    })),
    hourly: data.hourly.time.map((time: string, i: number) => ({
      time,
      temperature: data.hourly.temperature_2m[i],
      windSpeed: data.hourly.wind_speed_10m[i],
      precipitation: data.hourly.precipitation[i],
      pressure: data.hourly.surface_pressure[i],
    })),
  };
  return snapshot;
}
