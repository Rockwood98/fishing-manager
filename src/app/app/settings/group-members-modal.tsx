"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function GroupMembersModal({
  groupName,
  members,
}: {
  groupName: string;
  members: Member[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" className="mt-2 h-8 px-3 text-xs" onClick={() => setOpen(true)}>
        Pokaz czlonkow
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold">{groupName}</h3>
              <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => setOpen(false)}>
                Zamknij
              </Button>
            </div>
            <ul className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">
              {members.map((member) => (
                <li key={member.id} className="rounded-xl border border-zinc-200 p-2">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-zinc-500">{member.email}</p>
                  <p className="mt-1 text-xs text-zinc-500">Rola: {member.role}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
