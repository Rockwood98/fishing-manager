import { differenceInCalendarDays, isAfter, isBefore, startOfDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { calculateSplitwiseBalances } from "@/lib/budget/splitwise";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";
import { fetchOpenMeteoWeather } from "@/lib/weather/openMeteo";

type BalanceLite = { userId: string; userName: string; value: number };

function calculateSettlementsDetailed(balances: BalanceLite[]) {
  const debtors = balances
    .filter((b) => b.value < -0.01)
    .map((b) => ({ ...b, value: Math.abs(b.value) }));
  const creditors = balances
    .filter((b) => b.value > 0.01)
    .map((b) => ({ ...b }));
  const out: Array<{ fromUserId: string; toUserId: string; from: string; to: string; amount: number }> = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].value, creditors[j].value);
    if (amount > 0.01) {
      out.push({
        fromUserId: debtors[i].userId,
        toUserId: creditors[j].userId,
        from: debtors[i].userName,
        to: creditors[j].userName,
        amount,
      });
    }
    debtors[i].value -= amount;
    creditors[j].value -= amount;
    if (debtors[i].value <= 0.01) i += 1;
    if (creditors[j].value <= 0.01) j += 1;
  }
  return out;
}

export default async function DashboardPage() {
  const ctx = await getAppContext();
  const [tripsCount, recordsCount, nextTrip, lastTrip, weatherTrip, entries, members] = await Promise.all([
    prisma.trip.count({ where: { groupId: ctx.group.id } }),
    prisma.catchRecord.count({ where: { groupId: ctx.group.id } }),
    prisma.trip.findFirst({
      where: { groupId: ctx.group.id, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, startsAt: true, endsAt: true },
    }),
    prisma.trip.findFirst({
      where: { groupId: ctx.group.id },
      orderBy: { startsAt: "desc" },
      select: { id: true, title: true, startsAt: true, endsAt: true },
    }),
    prisma.trip.findFirst({
      where: { groupId: ctx.group.id, locationId: { not: null } },
      orderBy: [{ startsAt: "asc" }],
      include: { location: true },
    }),
    prisma.budgetEntry.findMany({
      where: { groupId: ctx.group.id },
      select: { id: true, type: true, amount: true, paidById: true, description: true },
    }),
    prisma.membership.findMany({
      where: { groupId: ctx.group.id },
      select: { userId: true, user: { select: { name: true } } },
    }),
  ]);
  const balances = calculateSplitwiseBalances(
    members,
    entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: Number(e.amount),
      paidById: e.paidById,
      description: e.description,
    })),
  );
  const myBalance = balances.find((b) => b.userId === ctx.userId)?.value ?? 0;
  const mySettlements = calculateSettlementsDetailed(balances).filter(
    (s) => s.fromUserId === ctx.userId,
  );
  const now = new Date();
  const nearestTrip = nextTrip ?? lastTrip;
  const nearestTripStatus = (() => {
    if (!nearestTrip) {
      return { title: "Brak wyjazdow", detail: "Dodaj pierwszy wyjazd w zakladce Wyjazdy." };
    }
    if (isAfter(now, nearestTrip.endsAt)) {
      return { title: nearestTrip.title, detail: "Odbyta" };
    }
    if (isBefore(now, nearestTrip.startsAt)) {
      const daysLeft = differenceInCalendarDays(startOfDay(nearestTrip.startsAt), startOfDay(now));
      if (daysLeft <= 0) return { title: nearestTrip.title, detail: "Start dzisiaj" };
      return { title: nearestTrip.title, detail: `Do wyjazdu: ${daysLeft} dni` };
    }
    return { title: nearestTrip.title, detail: "Trwa" };
  })();

  const currentWeather = weatherTrip?.location
    ? await fetchOpenMeteoWeather(
        weatherTrip.location.latitude,
        weatherTrip.location.longitude,
        new Date(),
        new Date(),
      )
    : null;

  const biteCondition = (() => {
    if (!currentWeather?.current) {
      return { title: "Brak danych", detail: "Dodaj wyjazd z lokalizacja, aby ocenic warunki." };
    }
    const { temperature, windSpeed, pressure, precipitation } = currentWeather.current;
    let score = 0;
    if (pressure >= 1008 && pressure <= 1022) score += 2;
    else if (pressure >= 1000 && pressure <= 1028) score += 1;
    else score -= 1;
    if (windSpeed <= 15) score += 2;
    else if (windSpeed <= 25) score += 1;
    else score -= 1;
    if (precipitation <= 0.2) score += 1;
    else if (precipitation > 1.2) score -= 1;
    if (temperature >= 8 && temperature <= 22) score += 1;

    if (score >= 5) return { title: "Warunki brań: bardzo dobre", detail: "Warto planowac lowienie." };
    if (score >= 3) return { title: "Warunki brań: dobre", detail: "Szansa na aktywne brania jest wysoka." };
    if (score >= 1) return { title: "Warunki brań: srednie", detail: "Brania mozliwe, ale mniej stabilne." };
    return { title: "Warunki brań: slabe", detail: "Dzisiaj moze byc trudniej o aktywne brania." };
  })();

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-gradient-to-br from-sky-600 to-cyan-700 text-white">
        <p className="text-xs uppercase tracking-wide text-white/80">Panel glowny</p>
        <h1 className="mt-1 text-2xl font-bold">Hej, {ctx.group.name}</h1>
        <p className="mt-1 text-sm text-white/85">
          Szybki podglad stanu wyjazdow, listy rzeczy, rekordow i budzetu.
        </p>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card className="bg-white/90 p-3">
          <p className="text-xs text-zinc-500">Wyjazdy</p>
          <p className="mt-1 text-2xl font-bold text-sky-700">{tripsCount}</p>
        </Card>
        <Card className="bg-white/90 p-3">
          <p className="text-xs text-zinc-500">Rekordy ryb</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{recordsCount}</p>
        </Card>
        <Card className="bg-white/90 p-3">
          <p className="text-xs text-zinc-500">Najblizszy wyjazd</p>
          <p className="mt-1 text-sm font-bold text-amber-700">{nearestTripStatus.title}</p>
          <p className="mt-1 text-xs text-zinc-600">{nearestTripStatus.detail}</p>
        </Card>
        <Card className="bg-white/90 p-3">
          <p className="text-xs text-zinc-500">Twoj bilans</p>
          <p className={`mt-1 text-2xl font-bold ${myBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {myBalance >= 0 ? "+" : ""}
            {myBalance.toFixed(2)} PLN
          </p>
          <div className="mt-1 text-[11px] text-zinc-600">
            {mySettlements.length ? (
              mySettlements.slice(0, 1).map((s, idx) => (
                <p key={`${s.toUserId}-${idx}`}>
                  Oddaj {s.to}: {s.amount.toFixed(2)} PLN
                </p>
              ))
            ) : myBalance < 0 ? (
              <p>Brak gotowych rozliczen, sprawdz Budzet.</p>
            ) : (
              <p>Aktualnie nic nie musisz oddawac.</p>
            )}
          </div>
        </Card>
        <Card className="bg-white/90 p-3">
          <p className="text-xs text-zinc-500">Pogoda i brania</p>
          {currentWeather?.current ? (
            <>
              <p className="mt-1 text-sm font-semibold text-sky-700">
                {Math.round(currentWeather.current.temperature)}°C, wiatr {Math.round(currentWeather.current.windSpeed)} km/h
              </p>
              <p className="mt-1 text-[11px] text-zinc-600">
                Cisnienie: {Math.round(currentWeather.current.pressure)} hPa
              </p>
            </>
          ) : (
            <p className="mt-1 text-[11px] text-zinc-600">Brak aktualnej pogody dla lokalizacji.</p>
          )}
          <p className="mt-1 text-[11px] font-semibold text-emerald-700">{biteCondition.title}</p>
          <p className="text-[11px] text-zinc-600">{biteCondition.detail}</p>
        </Card>
      </div>
    </div>
  );
}
