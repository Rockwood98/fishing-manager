"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerAction, type RegisterState } from "./actions";

const initialState: RegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Tworzenie konta..." : "Utworz konto"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full p-6">
        <h1 className="text-2xl font-bold">Rejestracja</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Utworz konto i dolacz do grupy przez link zaproszenia.
        </p>

        <form className="mt-5 space-y-3" action={formAction}>
          <Input name="name" required placeholder="Imie" />
          <Input name="email" type="email" required placeholder="Email" />
          <Input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Haslo (min. 8 znakow)"
          />
          <Input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            placeholder="Powtorz haslo"
          />

          {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
          {state.success ? (
            <p className="text-sm text-emerald-700">{state.success}</p>
          ) : null}

          <SubmitButton />
        </form>

        <p className="mt-4 text-sm text-zinc-600">
          Masz juz konto?{" "}
          <Link href="/login" className="font-medium text-sky-700 underline">
            Przejdz do logowania
          </Link>
        </p>
      </Card>
    </main>
  );
}
