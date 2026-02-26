export type FishingDayForecast = {
  date: string;
  score: number;
  level: "slabe" | "srednie" | "dobre" | "bardzo_dobre";
  reason: string;
  tempAvg: number;
  weatherCode?: number;
};

export type FishingForecast = {
  current: {
    temperature: number;
    windSpeed: number;
    pressure: number;
    precipitation: number;
  };
  today: FishingDayForecast;
  nextDays: FishingDayForecast[];
};

type OpenMeteoResponse = {
  current: {
    temperature_2m: number;
    wind_speed_10m: number;
    precipitation: number;
    surface_pressure: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    weather_code: number[];
    sunrise: string[];
    sunset: string[];
  };
};

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}

function levelFromScore(score: number): FishingDayForecast["level"] {
  if (score >= 75) return "bardzo_dobre";
  if (score >= 58) return "dobre";
  if (score >= 42) return "srednie";
  return "slabe";
}

function reasonFromScore(level: FishingDayForecast["level"]) {
  if (level === "bardzo_dobre") return "Stabilna pogoda, dobre okna poranne i wieczorne.";
  if (level === "dobre") return "Warunki sprzyjajace, warto lowic o swicie i o zmierzchu.";
  if (level === "srednie") return "Warunki mieszane, celuj w poranek.";
  return "Silny wiatr lub opad, brania moga byc slabsze.";
}

function scoreDay(input: {
  tMax: number;
  tMin: number;
  windMax: number;
  precipitationSum: number;
  sunrise: string;
  sunset: string;
}) {
  let score = 50;
  const tAvg = (input.tMax + input.tMin) / 2;
  if (tAvg >= 8 && tAvg <= 22) score += 10;
  else if (tAvg >= 4 && tAvg <= 26) score += 5;
  else score -= 6;

  if (input.windMax <= 16) score += 14;
  else if (input.windMax <= 24) score += 8;
  else if (input.windMax <= 34) score += 2;
  else score -= 12;

  if (input.precipitationSum <= 1) score += 8;
  else if (input.precipitationSum <= 4) score += 3;
  else if (input.precipitationSum <= 8) score -= 2;
  else score -= 10;

  // Dzien z dluzszym oknem swit/zmierzch zwykle daje wiecej aktywnosci ryb.
  const sunriseHour = new Date(input.sunrise).getHours();
  const sunsetHour = new Date(input.sunset).getHours();
  if (sunriseHour <= 6) score += 3;
  if (sunsetHour >= 19) score += 3;

  return clamp(Math.round(score), 0, 100);
}

export async function getFishingForecast(lat: number, lon: number, days = 5): Promise<FishingForecast> {
  const horizon = clamp(days, 3, 10);

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("timezone", "Europe/Warsaw");
  url.searchParams.set("forecast_days", String(horizon));
  url.searchParams.set(
    "current",
    "temperature_2m,wind_speed_10m,precipitation,surface_pressure",
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code,sunrise,sunset",
  );

  const res = await fetch(url.toString(), { next: { revalidate: 900 } });
  if (!res.ok) throw new Error("Blad pobierania kalendarza bran.");
  const data = (await res.json()) as OpenMeteoResponse;

  const daysForecast: FishingDayForecast[] = data.daily.time.map((date, i) => {
    const score = scoreDay({
      tMax: data.daily.temperature_2m_max[i],
      tMin: data.daily.temperature_2m_min[i],
      windMax: data.daily.wind_speed_10m_max[i],
      precipitationSum: data.daily.precipitation_sum[i],
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
    });
    const level = levelFromScore(score);
    return {
      date,
      score,
      level,
      reason: reasonFromScore(level),
      tempAvg: Math.round((data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2),
      weatherCode: data.daily.weather_code?.[i],
    };
  });

  return {
    current: {
      temperature: data.current.temperature_2m,
      windSpeed: data.current.wind_speed_10m,
      pressure: data.current.surface_pressure,
      precipitation: data.current.precipitation,
    },
    today: daysForecast[0],
    nextDays: daysForecast.slice(1),
  };
}
