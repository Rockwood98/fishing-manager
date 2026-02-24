import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { PACKING_CATEGORIES } from "@/lib/constants";
import { getAppContext } from "@/server/context";
import { createGroupAction, createInviteAction, deleteInviteAction } from "./actions";

export default async function SettingsPage() {
  const ctx = await getAppContext();
  const groups = await prisma.membership.findMany({
    where: { userId: ctx.userId },
    include: { group: { include: { memberships: { include: { user: true } }, invites: true } } },
  });

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-gradient-to-br from-sky-600 to-cyan-700 text-white">
        <h1 className="text-2xl font-bold">Ustawienia grupy</h1>
        <p className="mt-1 text-sm text-white/85">
          Zarzadzaj czlonkami, zaproszeniami i kategoriami listy rzeczy.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Twoje grupy</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {groups.map((m) => (
              <li key={m.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <p className="font-medium">{m.group.name}</p>
                <p className="text-zinc-500">Rola: {m.role}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Czlonkow: {m.group.memberships.length}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-semibold">Nowa grupa</h2>
          <p className="mt-1 text-sm text-zinc-500">Stworz oddzielna ekipe i zapros znajomych.</p>
          <form action={createGroupAction} className="mt-3 flex gap-2">
            <Input name="name" placeholder="Np. Ekipa na zasiadki" required />
            <Button type="submit">Utworz</Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">Zaproszenia</h2>
        <form action={createInviteAction} className="mt-3 flex flex-wrap gap-2">
          <Input name="email" placeholder="Email (opcjonalnie)" className="max-w-sm" />
          <Button type="submit">Generuj nowy link</Button>
        </form>
        <p className="mt-3 text-sm text-zinc-500">
          Po wygenerowaniu nowego linku stare aktywne zaproszenia sa automatycznie uniewazniane.
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {groups.flatMap((g) =>
            g.group.invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 p-3"
              >
                <div>
                  <p className="font-medium text-zinc-700">
                    {invite.email || "Zaproszenie bez emaila"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Status: {invite.status} | Wazne do:{" "}
                    {new Date(invite.expiresAt).toLocaleString("pl-PL")}
                  </p>
                </div>
                <form action={deleteInviteAction}>
                  <input type="hidden" name="inviteId" value={invite.id} />
                  <Button
                    type="submit"
                    variant="danger"
                    className="h-9 px-3"
                    disabled={invite.status !== "PENDING"}
                  >
                    Usun link
                  </Button>
                </form>
              </li>
            )),
          )}
        </ul>
      </Card>

      <Card>
        <h2 className="font-semibold">Kategorie i ikony</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {PACKING_CATEGORIES.map((c) => (
            <div key={c.name} className="rounded-xl border border-zinc-200 px-3 py-2 text-sm">
              {c.icon} {c.name}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
