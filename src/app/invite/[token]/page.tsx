import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/app/app/settings/actions";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full p-6">
        <h1 className="text-xl font-semibold">Zaproszenie do grupy</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Jesli masz konto, zaloguj sie i kliknij akceptacje. Jesli nie, zaloz konto.
        </p>
        <form
          action={async () => {
            "use server";
            await acceptInviteAction(token);
          }}
          className="mt-4"
        >
          <Button className="w-full">Akceptuje zaproszenie</Button>
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
