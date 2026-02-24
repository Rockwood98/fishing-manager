import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCategoryIcon } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getAppContext } from "@/server/context";
import {
  addTripItemAction,
  applyTemplateAction,
  removeTripItemAction,
  saveTemplateFromTripAction,
  toggleTripItemAction,
} from "./actions";
import { QuickAdd } from "./quick-add";
import { PackingTripPicker } from "./trip-picker";

const TEMPLATE_PREFIX = "TEMPLATE::";

export default async function PackingPage({
  searchParams,
}: {
  searchParams: Promise<{ tripId?: string }>;
}) {
  const { tripId } = await searchParams;
  const ctx = await getAppContext();
  const [templateRows, trips] = await Promise.all([
    prisma.packingCatalogItem.findMany({
      where: {
        groupId: ctx.group.id,
        archived: true,
        category: { startsWith: TEMPLATE_PREFIX },
      },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
    prisma.trip.findMany({
      where: { groupId: ctx.group.id },
      orderBy: { startsAt: "desc" },
      take: 30,
    }),
  ]);

  const templateNames = [...new Set(templateRows.map((r) => r.category.split("::")[1]))].filter(
    Boolean,
  );
  const selectedTrip = trips.find((t) => t.id === tripId) ?? trips[0];
  const tripItems = selectedTrip
    ? await prisma.tripPackingItem.findMany({
        where: { tripId: selectedTrip.id },
        orderBy: [{ checked: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
      })
    : [];

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-gradient-to-br from-sky-600 to-cyan-700 text-white">
        <h1 className="text-2xl font-bold">Lista rzeczy</h1>
        <p className="mt-1 text-sm text-white/85">
          Szybkie dodawanie, podpowiedzi i szablony Twojej ekipy.
        </p>
      </Card>
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold">Lista na wyjazd</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Podczas wpisywania dziala autouzupełnianie. Nowe pozycje sa zapamietywane
              i podpowiadane przy kolejnych wpisaniach.
            </p>
          </div>
          <PackingTripPicker
            trips={trips.map((t) => ({ id: t.id, title: t.title }))}
            selectedTripId={selectedTrip?.id}
          />
        </div>

        {selectedTrip ? (
          <>
            <div className="mt-3">
              <QuickAdd tripId={selectedTrip.id} onSubmit={addTripItemAction} />
            </div>

            <div className="mt-4 rounded-xl border border-zinc-200 p-3">
              <h3 className="font-medium">Szablony grupy</h3>
              <p className="mt-1 text-sm text-zinc-600">
                Tworzysz je sam na podstawie aktualnej listy wyjazdu i uzywasz ponownie.
              </p>
              <form action={saveTemplateFromTripAction} className="mt-3 flex flex-wrap gap-2">
                <input type="hidden" name="tripId" value={selectedTrip.id} />
                <Input
                  name="templateName"
                  placeholder="Nazwa grupy artykulow, np. Nocna zasadka"
                  required
                  className="max-w-sm"
                />
                <Button type="submit" variant="secondary">
                  Zapisz aktualna liste jako szablon
                </Button>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                {templateNames.map((name) => (
                  <form key={name} action={applyTemplateAction}>
                    <input type="hidden" name="tripId" value={selectedTrip.id} />
                    <input type="hidden" name="templateName" value={name} />
                    <Button type="submit" variant="secondary">
                      Uzyj: {name}
                    </Button>
                  </form>
                ))}
                {!templateNames.length ? (
                  <p className="text-sm text-zinc-500">Brak zapisanych szablonow.</p>
                ) : null}
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {tripItems.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
                    item.checked
                      ? "border-zinc-200 bg-zinc-100 text-zinc-500 line-through"
                      : "border-zinc-200 bg-white"
                  }`}
                >
                  <form action={toggleTripItemAction} className="flex items-center gap-2">
                    <input type="hidden" name="itemId" value={item.id} />
                    <button
                      aria-label="toggle"
                      className={`size-5 rounded border ${
                        item.checked ? "border-zinc-400 bg-zinc-300" : "border-zinc-300 bg-white"
                      }`}
                    />
                    <span>
                      {item.icon || getCategoryIcon(item.category)} {item.name}
                    </span>
                  </form>
                  <form action={removeTripItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <Button type="submit" variant="ghost">
                      Usun
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">
            Najpierw dodaj wyjazd w zakladce Wyjazdy.
          </p>
        )}
      </Card>
    </div>
  );
}
