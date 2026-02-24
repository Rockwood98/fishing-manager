import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  calculateSettlements,
  calculateSplitwiseBalances,
  parseBudgetMeta,
} from "@/lib/budget/splitwise";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";
import { createSettlementAction, createSplitExpenseAction } from "./actions";

function money(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)} PLN`;
}

export default async function BudgetPage() {
  const ctx = await getAppContext();
  const [entries, members, trips] = await Promise.all([
    prisma.budgetEntry.findMany({
      where: { groupId: ctx.group.id },
      include: { paidBy: true },
      orderBy: { entryDate: "desc" },
    }),
    prisma.membership.findMany({
      where: { groupId: ctx.group.id },
      include: { user: true },
    }),
    prisma.trip.findMany({ where: { groupId: ctx.group.id }, orderBy: { startsAt: "desc" } }),
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
  ).sort((a, b) => b.value - a.value);

  const settlements = calculateSettlements(
    balances.map((b) => ({ userName: b.userName, value: b.value })),
  );

  const totalExpenses = entries
    .filter((x) => x.type === "EXPENSE")
    .reduce((acc, x) => acc + Number(x.amount), 0);
  const totalSettlements = entries
    .filter((x) => x.type === "DEPOSIT")
    .reduce((acc, x) => acc + Number(x.amount), 0);
  const maxAbsBalance = Math.max(...balances.map((b) => Math.abs(b.value)), 1);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-sky-600 to-cyan-700 text-white">
        <p className="text-xs uppercase tracking-wider text-white/80">Budzet grupy</p>
        <h1 className="mt-1 text-2xl font-bold">Rozliczenia jak w Splitwise</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-xs text-white/80">Wydatki</p>
            <p className="text-xl font-semibold">{totalExpenses.toFixed(2)} PLN</p>
          </div>
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-xs text-white/80">Splaty</p>
            <p className="text-xl font-semibold">{totalSettlements.toFixed(2)} PLN</p>
          </div>
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-xs text-white/80">Wpisy</p>
            <p className="text-xl font-semibold">{entries.length}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Nowy wydatek</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Kto zaplacil, ile i dla kogo dzielimy koszt.
          </p>
          <form action={createSplitExpenseAction} className="mt-3 grid gap-2 md:grid-cols-2">
            <Input name="category" placeholder="Kategoria (np. Paliwo)" required />
            <Input name="amount" type="number" step="0.01" placeholder="Kwota" required />
            <select
              name="paidById"
              className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  Oplacil: {m.user.name}
                </option>
              ))}
            </select>
            <select
              name="tripId"
              className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
            >
              <option value="">Bez wyjazdu</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title}
                </option>
              ))}
            </select>
            <Input name="entryDate" type="datetime-local" required />
            <Input name="note" placeholder="Opis (opcjonalnie)" />

            <div className="md:col-span-2">
              <p className="mb-1 text-sm font-medium">Uczestnicy kosztu</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {members.map((m) => (
                  <label
                    key={m.userId}
                    className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    <input type="checkbox" name="participantIds" value={m.userId} defaultChecked />
                    {m.user.name}
                  </label>
                ))}
              </div>
            </div>

            <Button type="submit" className="md:col-span-2">
              Dodaj wydatek
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="font-semibold">Zarejestruj splate</h2>
          <p className="mt-1 text-sm text-zinc-500">Oznacz, ze jedna osoba oddala pieniadze drugiej.</p>
          <form action={createSettlementAction} className="mt-3 grid gap-2 md:grid-cols-2">
            <select
              name="fromUserId"
              className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  Placacy: {m.user.name}
                </option>
              ))}
            </select>
            <select
              name="toUserId"
              className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  Odbiorca: {m.user.name}
                </option>
              ))}
            </select>
            <Input name="amount" type="number" step="0.01" placeholder="Kwota splaty" required />
            <Input name="entryDate" type="datetime-local" required />
            <Input name="note" placeholder="Opis (opcjonalnie)" className="md:col-span-2" />
            <Button type="submit" variant="secondary" className="md:col-span-2">
              Dodaj splate
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Bilans osob</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {balances.map((row) => {
              const percent = Math.max(8, (Math.abs(row.value) / maxAbsBalance) * 100);
              return (
                <li key={row.userId} className="rounded-xl border border-zinc-200 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{row.userName}</span>
                    <span className={row.value >= 0 ? "text-emerald-700" : "text-rose-700"}>
                      {money(row.value)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-zinc-100">
                    <div
                      className={`h-2 rounded-full ${row.value >= 0 ? "bg-emerald-500" : "bg-rose-500"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold">Propozycja rozliczen</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {settlements.map((s, i) => (
              <li key={`${s.from}-${s.to}-${i}`} className="rounded-xl border border-zinc-200 p-2">
                <span className="font-medium">{s.from}</span> {"->"}{" "}
                <span className="font-medium">{s.to}</span>
                <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
                  {s.amount.toFixed(2)} PLN
                </span>
              </li>
            ))}
            {!settlements.length ? (
              <li className="rounded-xl border border-dashed border-zinc-300 p-3 text-zinc-500">
                Brak rozliczen.
              </li>
            ) : null}
          </ul>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">Historia</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {entries.map((entry) => {
            const meta = parseBudgetMeta(entry.description);
            if (entry.type === "EXPENSE") {
              const participants =
                meta?.kind === "expense"
                  ? meta.participantIds
                      .map((id) => members.find((m) => m.userId === id)?.user.name)
                      .filter(Boolean)
                      .join(", ")
                  : "Wszyscy";
              return (
                <li key={entry.id} className="rounded-xl border border-zinc-200 p-3">
                  <p className="font-medium">
                    Wydatek: {entry.category} · {Number(entry.amount).toFixed(2)} PLN
                  </p>
                  <p className="mt-1 text-zinc-600">
                    Oplacil: {entry.paidBy.name} · Uczestnicy: {participants}
                  </p>
                </li>
              );
            }

            if (meta?.kind === "settlement") {
              const receiver = members.find((m) => m.userId === meta.receiverId)?.user.name;
              return (
                <li key={entry.id} className="rounded-xl border border-zinc-200 p-3">
                  <p className="font-medium">
                    Splata: {Number(entry.amount).toFixed(2)} PLN
                  </p>
                  <p className="mt-1 text-zinc-600">
                    {entry.paidBy.name} zaplacil(a) {receiver}
                  </p>
                </li>
              );
            }

            return (
              <li key={entry.id} className="rounded-xl border border-zinc-200 p-3 text-zinc-600">
                Wpis legacy: {entry.category} {Number(entry.amount).toFixed(2)} PLN
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
