import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSubmitButton } from "@/components/ui/loading-submit-button";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";
import {
  createCatchRecordAction,
  deleteCatchRecordAction,
  updateCatchRecordAction,
} from "./actions";
import { RecordsCharts } from "./charts";

function groupCount(values: string[]) {
  const map = new Map<string, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()].map(([key, count]) => ({ key, count }));
}

export default async function RecordsPage() {
  const ctx = await getAppContext();
  const [records, trips] = await Promise.all([
    prisma.catchRecord.findMany({
      where: { groupId: ctx.group.id },
      include: { createdBy: true },
      orderBy: { lengthCm: "desc" },
    }),
    prisma.trip.findMany({ where: { groupId: ctx.group.id }, orderBy: { startsAt: "desc" } }),
  ]);

  const topBySpecies = Object.values(
    records.reduce<Record<string, (typeof records)[number]>>((acc, rec) => {
      if (!acc[rec.speciesName] || acc[rec.speciesName].lengthCm < rec.lengthCm) {
        acc[rec.speciesName] = rec;
      }
      return acc;
    }, {}),
  );
  const ranking = Object.values(
    records.reduce<Record<string, { user: string; catches: number; best: number }>>((acc, rec) => {
      const key = rec.createdBy.name;
      if (!acc[key]) acc[key] = { user: key, catches: 0, best: 0 };
      acc[key].catches += 1;
      acc[key].best = Math.max(acc[key].best, rec.lengthCm);
      return acc;
    }, {}),
  ).sort((a, b) => b.best - a.best);

  const byMonth = groupCount(
    records.map((r) => `${r.caughtAt.getFullYear()}-${String(r.caughtAt.getMonth() + 1).padStart(2, "0")}`),
  );
  const byHour = groupCount(records.map((r) => `${r.caughtAt.getHours()}:00`));
  const nightBest = records
    .filter((r) => r.caughtAt.getHours() >= 20 || r.caughtAt.getHours() < 6)
    .sort((a, b) => b.lengthCm - a.lengthCm)[0];

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-gradient-to-br from-sky-600 to-cyan-700 text-white">
        <h1 className="text-2xl font-bold">Rekordy</h1>
        <p className="mt-1 text-sm text-white/85">Dodawaj ryby i porownuj wyniki ekipy.</p>
      </Card>

      <Card>
        <h2 className="font-semibold">Dodaj zlowiona rybe</h2>
        <form action={createCatchRecordAction} className="mt-3 grid gap-2 md:grid-cols-3">
          <Input name="speciesName" placeholder="Gatunek" required />
          <Input name="lengthCm" type="number" step="0.1" placeholder="Dlugosc (cm)" required />
          <Input name="weightKg" type="number" step="0.01" placeholder="Waga (kg)" />
          <label className="grid min-w-0 gap-1">
            <span className="text-xs text-zinc-500">Data i godzina</span>
            <div className="trip-datetime-shell">
              <input name="caughtAt" type="datetime-local" required className="trip-datetime" />
            </div>
          </label>
          <select name="tripId" className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm">
            <option value="">Bez wyjazdu</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.title}
              </option>
            ))}
          </select>
          <Input name="fisheryName" placeholder="Lowisko" />
          <Input name="baitName" placeholder="Przyneta / zaneta" />
          <Input name="method" placeholder="Metoda" />
          <Input name="photoUrl" placeholder="URL zdjecia (MVP)" />
          <LoadingSubmitButton idleText="Zapisz rekord" pendingText="Zapisywanie..." />
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="font-semibold">TOP per gatunek</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {topBySpecies.map((r) => (
              <li key={r.id} className="rounded-lg bg-zinc-50 px-2 py-1">
                {r.speciesName}: <b>{r.lengthCm} cm</b> ({r.createdBy.name})
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold">Ranking osob</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {ranking.map((r, i) => (
              <li key={r.user} className="rounded-lg bg-zinc-50 px-2 py-1">
                {i + 1}. {r.user} - PB {r.best} cm, zlowien {r.catches}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold">Najlepsza noc (20:00-06:00)</h2>
          <p className="mt-2 text-sm">
            {nightBest
              ? `${nightBest.speciesName} ${nightBest.lengthCm} cm (${nightBest.createdBy.name})`
              : "Brak danych nocnych."}
          </p>
        </Card>
      </div>

      <RecordsCharts byMonth={byMonth} byHour={byHour} />

      <Card>
        <h2 className="font-semibold">Wszystkie rekordy</h2>
        <ul className="mt-3 space-y-2">
          {records.map((record) => (
            <li key={record.id} className="rounded-xl border border-zinc-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {record.speciesName} - {record.lengthCm} cm
                    {record.weightKg ? `, ${record.weightKg} kg` : ""}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {format(record.caughtAt, "dd.MM.yyyy HH:mm")} | {record.createdBy.name}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {record.fisheryName ? `Lowisko: ${record.fisheryName}` : "Lowisko: -"} |{" "}
                    {record.method ? `Metoda: ${record.method}` : "Metoda: -"}
                  </p>
                </div>
                <form action={deleteCatchRecordAction}>
                  <input type="hidden" name="recordId" value={record.id} />
                  <LoadingSubmitButton
                    idleText="Usun"
                    pendingText="Usuwanie..."
                    variant="danger"
                  />
                </form>
              </div>

              <details className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-sky-700">
                  Edytuj rekord
                </summary>
                <form action={updateCatchRecordAction} className="grid gap-2 p-3 md:grid-cols-3">
                  <input type="hidden" name="recordId" value={record.id} />
                  <Input name="speciesName" defaultValue={record.speciesName} required />
                  <Input
                    name="lengthCm"
                    type="number"
                    step="0.1"
                    defaultValue={record.lengthCm}
                    required
                  />
                  <Input
                    name="weightKg"
                    type="number"
                    step="0.01"
                    defaultValue={record.weightKg ?? ""}
                  />
                  <label className="grid min-w-0 gap-1">
                    <span className="text-xs text-zinc-500">Data i godzina</span>
                    <div className="trip-datetime-shell">
                      <input
                        name="caughtAt"
                        type="datetime-local"
                        required
                        className="trip-datetime"
                        defaultValue={format(record.caughtAt, "yyyy-MM-dd'T'HH:mm")}
                      />
                    </div>
                  </label>
                  <select
                    name="tripId"
                    defaultValue={record.tripId ?? ""}
                    className="h-10 rounded-xl border border-zinc-300 bg-white px-3 text-sm"
                  >
                    <option value="">Bez wyjazdu</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}
                      </option>
                    ))}
                  </select>
                  <Input name="fisheryName" defaultValue={record.fisheryName ?? ""} />
                  <Input name="baitName" defaultValue={record.baitName ?? ""} />
                  <Input name="method" defaultValue={record.method ?? ""} />
                  <Input name="photoUrl" defaultValue={record.photoUrl ?? ""} />
                  <div className="md:col-span-3">
                    <LoadingSubmitButton
                      idleText="Zapisz zmiany"
                      pendingText="Zapisywanie..."
                    />
                  </div>
                </form>
              </details>
            </li>
          ))}
          {!records.length ? <li className="text-sm text-zinc-500">Brak rekordow.</li> : null}
        </ul>
      </Card>
    </div>
  );
}
