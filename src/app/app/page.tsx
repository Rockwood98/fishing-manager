import { differenceInCalendarDays, isAfter, isBefore, startOfDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { calculateSplitwiseBalances } from "@/lib/budget/splitwise";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";

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
  const [tripsCount, recordsCount, nextTrip, lastTrip, entries, members] = await Promise.all([
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

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-gradient-to-br from-sky-600 to-cyan-700 text-white">
        <p className="text-xs uppercase tracking-wide text-white/80">Panel glowny</p>
        <h1 className="mt-1 text-2xl font-bold">Hej, {ctx.group.name}</h1>
        <p className="mt-1 text-sm text-white/85">
          Szybki podglad stanu wyjazdow, listy rzeczy, rekordow i budzetu.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white/90">
          <p className="text-sm text-zinc-500">Wyjazdy</p>
          <p className="mt-1 text-3xl font-bold text-sky-700">{tripsCount}</p>
        </Card>
        <Card className="bg-white/90">
          <p className="text-sm text-zinc-500">Rekordy ryb</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{recordsCount}</p>
        </Card>
        <Card className="bg-white/90">
          <p className="text-sm text-zinc-500">Najblizszy wyjazd</p>
          <p className="mt-1 text-base font-bold text-amber-700">{nearestTripStatus.title}</p>
          <p className="mt-1 text-sm text-zinc-600">{nearestTripStatus.detail}</p>
        </Card>
        <Card className="bg-white/90">
          <p className="text-sm text-zinc-500">Twoj bilans</p>
          <p className={`mt-1 text-3xl font-bold ${myBalance >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            {myBalance >= 0 ? "+" : ""}
            {myBalance.toFixed(2)} PLN
          </p>
          <div className="mt-2 text-xs text-zinc-600">
            {mySettlements.length ? (
              mySettlements.slice(0, 2).map((s, idx) => (
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
      </div>
    </div>
  );
}
