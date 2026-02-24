"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm({
  registered,
  inviteToken,
}: {
  registered: boolean;
  inviteToken: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.ok) {
      router.push(inviteToken ? `/invite/${inviteToken}` : "/app");
      return;
    }
    setError("Bledny email lub haslo.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full p-6">
        <h1 className="text-2xl font-bold">Fishing Manager</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Zaloguj sie, aby zarzadzac wspolnymi wyjazdami.
        </p>
        {inviteToken ? (
          <p className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-700">
            Zaloguj sie, aby zaakceptowac zaproszenie do grupy.
          </p>
        ) : null}
        {registered ? (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Konto utworzone. Zaloguj sie.
          </p>
        ) : null}
        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <Input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            required
            placeholder="Haslo"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logowanie..." : "Zaloguj"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-zinc-600">
          Nie masz konta?{" "}
          <Link
            href={inviteToken ? `/register?invite=${encodeURIComponent(inviteToken)}` : "/register"}
            className="font-medium text-sky-700 underline"
          >
            Zarejestruj sie
          </Link>
        </p>
      </Card>
    </main>
  );
}
