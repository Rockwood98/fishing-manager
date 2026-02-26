import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameMonth,
  isWithinInterval,
  parse,
  startOfDay,
  startOfMonth,
  startOfToday,
  startOfWeek,
} from "date-fns";
import { pl } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSubmitButton } from "@/components/ui/loading-submit-button";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";
import {
  addTripParticipantAction,
  createTripAction,
  deleteTripAction,
  removeTripParticipantAction,
} from "./actions";
import { LocationPicker } from "./location-picker";
import { TripsControls } from "./trips-controls";
import { WeatherPanel } from "./weather-panel";

function durationDays(startsAt: Date, endsAt: Date) {
  const ms = endsAt.getTime() - startsAt.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function tripStatus(startsAt: Date, endsAt: Date) {
  const now = new Date();
  if (isAfter(now, endsAt)) {
    return { label: "Odbyta", className: "bg-zinc-100 text-zinc-700" };
  }
  if (isBefore(now, startsAt)) {
    const daysLeft = differenceInCalendarDays(startOfDay(startsAt), startOfDay(now));
    if (daysLeft <= 0) {
      return { label: "Start dzisiaj", className: "bg-amber-100 text-amber-700" };
    }
    return {
      label: `Do wyjazdu: ${daysLeft} dni`,
      className: "bg-sky-100 text-sky-700",
    };
  }
  return { label: "Trwa", className: "bg-emerald-100 text-emerald-700" };
}

type ViewMode = "list" | "week" | "month";

function tripOnDay(day: Date, start: Date, end: Date) {
  return isWithinInterval(day, { start, end });
}

type TripWeatherDaily = {
  date: string;
  tempMax?: number;
  tempMin?: number;
  precipitationSum?: number;
  weatherCode?: number;
};

function buildDailyWeatherMap(trips: Array<{ id: string; weatherCache: unknown }>) {
  const out = new Map<string, Map<string, TripWeatherDaily>>();
  for (const trip of trips) {
    const cache = trip.weatherCache as { daily?: TripWeatherDaily[] } | null;
    const dailyMap = new Map<string, TripWeatherDaily>();
    for (const day of cache?.daily ?? []) {
      if (day?.date) dailyMap.set(day.date, day);
    }
    out.set(trip.id, dailyMap);
  }
  return out;
}

function weatherIcon(day: TripWeatherDaily | null) {
  if (!day) return "•";
  const code = day.weatherCode;
  if (typeof code === "number") {
    if (code === 0) return "☀️";
    if ([1, 2, 3, 45, 48].includes(code)) return "☁️";
    if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
  }
  if ((day.precipitationSum ?? 0) > 0.8) return "🌧️";
  if ((day.precipitationSum ?? 0) > 0.1) return "☁️";
  return "☀️";
}

function avgTemp(day: TripWeatherDaily | null) {
  if (!day || typeof day.tempMax !== "number" || typeof day.tempMin !== "number") {
    return null;
  }
  return Math.round((day.tempMax + day.tempMin) / 2);
}

function monthFromCursor(cursor?: string) {
  if (!cursor) return startOfMonth(new Date());
  const parsed = parse(`${cursor}-01`, "yyyy-MM-dd", new Date());
  if (Number.isNaN(parsed.getTime())) return startOfMonth(new Date());
  return startOfMonth(parsed);
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string }>;
}) {
  const query = await searchParams;
  const view = (query.view ?? "list") as ViewMode;
  const monthDate = monthFromCursor(query.month);
  const ctx = await getAppContext();
  const [trips, members] = await Promise.all([
    prisma.trip.findMany({
      where: { groupId: ctx.group.id },
      include: {
        location: true,
        participants: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.membership.findMany({
      where: { groupId: ctx.group.id },
      include: { user: true },
    }),
  ]);

  const monthGridDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 }),
  });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfToday(), i));
  const weatherMap = buildDailyWeatherMap(trips);

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-gradient-to-br from-sky-600 to-cyan-700 text-white">
        <h1 className="text-2xl font-bold">Wyjazdy</h1>
        <p className="mt-1 text-sm text-white/85">Planuj terminy, miejsca i pogode.</p>
      </Card>

      <Card>
        <h2 className="font-semibold">Nowy wyjazd</h2>
        <form action={createTripAction} className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-zinc-700">Nazwa wyjazdu</span>
            <Input name="title" placeholder="Np. Zasiadka weekendowa" required />
          </label>
          <label className="grid min-w-0 gap-1">
            <span className="text-sm font-medium text-zinc-700">Start</span>
            <div className="trip-datetime-shell">
              <input name="startsAt" type="datetime-local" required className="trip-datetime" />
            </div>
          </label>
          <label className="grid min-w-0 gap-1">
            <span className="text-sm font-medium text-zinc-700">Koniec</span>
            <div className="trip-datetime-shell">
              <input name="endsAt" type="datetime-local" required className="trip-datetime" />
            </div>
          </label>
          <LocationPicker />
          <div className="md:col-span-2 xl:col-span-3">
            <LoadingSubmitButton
              idleText="Dodaj wyjazd"
              pendingText="Tworzenie wyjazdu..."
              className="w-full sm:w-auto"
            />
          </div>
        </form>
      </Card>

      <Card>
        <TripsControls currentView={view} currentMonth={format(monthDate, "yyyy-MM")} />

        {view === "month" ? (
          <>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{format(monthDate, "LLLL yyyy", { locale: pl })}</p>
            </div>

            <div className="mt-3 overflow-x-auto pb-1">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-7 gap-3 text-center text-xs font-semibold text-zinc-500">
                  {["Pon", "Wt", "Sr", "Czw", "Pt", "Sob", "Nd"].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-7 gap-3">
                  {monthGridDays.map((day) => {
                    const dayTrips = trips.filter((trip) => tripOnDay(day, trip.startsAt, trip.endsAt));
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-32 rounded-xl border p-2 ${
                          isSameMonth(day, monthDate)
                            ? "border-zinc-200 bg-white"
                            : "border-zinc-100 bg-zinc-50 text-zinc-400"
                        }`}
                      >
                        <p className="text-xs font-semibold">{format(day, "dd MMM", { locale: pl })}</p>
                        <div className="mt-1 space-y-1">
                          {dayTrips.slice(0, 2).map((trip) => {
                            const key = format(day, "yyyy-MM-dd");
                            const weatherDay = weatherMap.get(trip.id)?.get(key) ?? null;
                            const temp = avgTemp(weatherDay);
                            return (
                              <div key={trip.id} className="rounded bg-sky-50 px-1.5 py-1 text-[11px]">
                                <p className="truncate font-medium text-zinc-800">{trip.title}</p>
                                <p className="mt-0.5 text-zinc-600">
                                  {weatherIcon(weatherDay)} {temp !== null ? `${temp} C` : "--"}
                                </p>
                              </div>
                            );
                          })}
                          {!dayTrips.length ? <p className="text-[11px] text-zinc-400">Brak</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {view === "week" ? (
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {weekDays.map((day) => {
              const dayTrips = trips.filter((trip) => tripOnDay(day, trip.startsAt, trip.endsAt));
              return (
                <div key={day.toISOString()} className="rounded-xl border border-zinc-200 p-3">
                  <p className="font-medium">{format(day, "EEEE, dd MMM", { locale: pl })}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {dayTrips.map((trip) => {
                      const key = format(day, "yyyy-MM-dd");
                      const weatherDay = weatherMap.get(trip.id)?.get(key) ?? null;
                      const temp = avgTemp(weatherDay);
                      return (
                        <li key={trip.id} className="rounded bg-zinc-50 px-2 py-1">
                          <p>{trip.title}</p>
                          <p className="text-xs text-zinc-600">
                            {weatherIcon(weatherDay)} {temp !== null ? `${temp} C` : "--"}
                          </p>
                        </li>
                      );
                    })}
                    {!dayTrips.length ? <li className="text-zinc-400">Brak wyjazdow</li> : null}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : null}

        {view === "list" ? (
          <div className="mt-3 grid gap-2">
            {trips.map((trip) => {
              const status = tripStatus(trip.startsAt, trip.endsAt);
              const tripParticipants = trip.participants.length
                ? trip.participants.map((p) => ({ id: p.user.id, name: p.user.name }))
                : members.map((m) => ({ id: m.user.id, name: m.user.name }));
              const participantIds = new Set(tripParticipants.map((participant) => participant.id));
              const availableMembers = members.filter((member) => !participantIds.has(member.userId));

              return (
                <div key={trip.id} className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{trip.title}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">
                    {format(trip.startsAt, "dd MMM yyyy HH:mm", { locale: pl })} -{" "}
                    {format(trip.endsAt, "dd MMM yyyy HH:mm", { locale: pl })} · {durationDays(trip.startsAt, trip.endsAt)} dni
                  </p>
                  <p className="text-sm">
                    Miejsce: {trip.location?.name} ({trip.location?.latitude}, {trip.location?.longitude})
                  </p>
                  <p className="mt-1 text-sm">Uczestnicy:</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {tripParticipants.map((participant) => (
                      <div
                        key={`${trip.id}-${participant.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs"
                      >
                        <span>{participant.name}</span>
                        {ctx.membership.role !== "MEMBER" ? (
                          <form action={removeTripParticipantAction}>
                            <input type="hidden" name="tripId" value={trip.id} />
                            <input type="hidden" name="userId" value={participant.id} />
                            <LoadingSubmitButton
                              idleText="Usun"
                              pendingText="..."
                              variant="ghost"
                              className="h-6 px-2 text-[11px] text-rose-600"
                            />
                          </form>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {ctx.membership.role !== "MEMBER" ? (
                    <div className="mt-2">
                      {availableMembers.length ? (
                        <form action={addTripParticipantAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="tripId" value={trip.id} />
                          <select
                            name="userId"
                            required
                            className="h-9 rounded-xl border border-zinc-300 bg-white px-3 text-xs"
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Dodaj uczestnika...
                            </option>
                            {availableMembers.map((member) => (
                              <option key={member.userId} value={member.userId}>
                                {member.user.name}
                              </option>
                            ))}
                          </select>
                          <LoadingSubmitButton
                            idleText="Dodaj uczestnika"
                            pendingText="Dodawanie..."
                            variant="secondary"
                            className="h-9 px-3 text-xs"
                          />
                        </form>
                      ) : (
                        <p className="text-xs text-zinc-500">Wszyscy czlonkowie grupy sa juz dodani.</p>
                      )}
                    </div>
                  ) : null}
                  <details className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50">
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-sky-700">
                      Pokaz pogode
                    </summary>
                    <div className="p-2">
                      <WeatherPanel tripId={trip.id} cached={trip.weatherCache as never} />
                    </div>
                  </details>
                  {ctx.membership.role !== "MEMBER" ? (
                    <form action={deleteTripAction} className="mt-2">
                      <input type="hidden" name="tripId" value={trip.id} />
                      <LoadingSubmitButton
                        idleText="Usun wyjazd"
                        pendingText="Usuwanie..."
                        variant="danger"
                      />
                    </form>
                  ) : null}
                </div>
              );
            })}
            {!trips.length ? <p className="text-sm text-zinc-500">Brak wyjazdow.</p> : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

