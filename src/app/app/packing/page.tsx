import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSubmitButton } from "@/components/ui/loading-submit-button";
import { PackingNeedType } from "@prisma/client";
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
import { PackingTabs } from "./packing-tabs";
import { PackingTripPicker } from "./trip-picker";

const TEMPLATE_PREFIX = "TEMPLATE::";

export default async function PackingPage({
  searchParams,
}: {
  searchParams: Promise<{ tripId?: string; tab?: string }>;
}) {
  const { tripId, tab } = await searchParams;
  const activeTab = tab === "buy" || tab === "take" ? tab : "all";
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
        where: {
          tripId: selectedTrip.id,
          ...(activeTab === "buy"
            ? { needType: PackingNeedType.TO_BUY }
            : activeTab === "take"
              ? { needType: PackingNeedType.TO_TAKE }
              : {}),
        },
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

            <PackingTabs activeTab={activeTab} tripId={selectedTrip.id} />

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
                <LoadingSubmitButton
                  idleText="Zapisz aktualna liste jako szablon"
                  pendingText="Zapisywanie..."
                  variant="secondary"
                />
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                {templateNames.map((name) => (
                  <form key={name} action={applyTemplateAction}>
                    <input type="hidden" name="tripId" value={selectedTrip.id} />
                    <input type="hidden" name="templateName" value={name} />
                    <LoadingSubmitButton
                      idleText={`Uzyj: ${name}`}
                      pendingText="Stosowanie..."
                      variant="secondary"
                    />
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
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.needType === PackingNeedType.TO_BUY
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {item.needType === PackingNeedType.TO_BUY ? "Kupic" : "Zabrac"}
                    </span>
                  </form>
                  <form action={removeTripItemAction}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <LoadingSubmitButton
                      idleText="Usun"
                      pendingText="Usuwanie..."
                      variant="ghost"
                    />
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
