import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/app/app/settings/actions";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;
  const errorMessage =
    status === "expired"
      ? "Ten link zaproszenia jest juz nieaktywny lub wygasl."
      : status === "not_found"
        ? "Nie znaleziono zaproszenia."
        : status === "already_member"
          ? "Juz jestes w tej grupie."
        : status === "error"
          ? "Nie udalo sie zaakceptowac zaproszenia. Sprobuj ponownie."
          : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full p-6">
        <h1 className="text-xl font-semibold">Zaproszenie do grupy</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Jesli masz konto, zaloguj sie i kliknij akceptacje. Jesli nie, zaloz konto.
        </p>
        {errorMessage ? (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
        <form
          action={async () => {
            "use server";
            await acceptInviteAction(token);
          }}
          className="mt-4"
        >
          <Button className="w-full" disabled={Boolean(errorMessage)}>
            Akceptuje zaproszenie
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href={`/login?invite=${encodeURIComponent(token)}`}
            className="text-sky-700 underline"
          >
            Mam konto - logowanie
          </Link>
          <Link
            href={`/register?invite=${encodeURIComponent(token)}`}
            className="text-sky-700 underline"
          >
            Nie mam konta - rejestracja
          </Link>
        </div>
      </Card>
    </main>
  );
}
