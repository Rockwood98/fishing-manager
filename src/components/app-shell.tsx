"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  Fish,
  Home,
  ListChecks,
  LogOut,
  PiggyBank,
  Settings,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/app", label: "Start", icon: Home },
  { href: "/app/trips", label: "Wyjazdy", icon: CalendarDays },
  { href: "/app/packing", label: "Rzeczy", icon: ListChecks },
  { href: "/app/records", label: "Rekordy", icon: Fish },
  { href: "/app/budget", label: "Budzet", icon: PiggyBank },
  { href: "/app/settings", label: "Opcje", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2 md:px-6">
          <p className="text-sm font-semibold text-zinc-800">Fishing Manager</p>
          <Button
            variant="ghost"
            className="h-9 gap-2 px-3"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              await signOut({ callbackUrl: "/login" });
            }}
          >
            <LogOut className="size-4" />
            <span>{signingOut ? "Wylogowanie..." : "Wyloguj"}</span>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 pb-24 pt-4 md:px-6 md:pt-8">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur md:static md:mt-8 md:border-0 md:bg-transparent">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 py-1 md:justify-start md:gap-2 md:px-6 md:py-0">
          {links.map((link) => {
            const Icon = link.icon;
            const active =
              link.href === "/app"
                ? pathname === "/app"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex min-w-16 flex-none flex-col items-center justify-center rounded-xl px-3 py-2 text-[11px] leading-tight text-zinc-600 md:min-w-0 md:flex-row md:gap-2 md:text-sm",
                  active && "bg-sky-100 text-sky-700",
                )}
              >
                <Icon className="size-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
