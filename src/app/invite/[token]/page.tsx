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
      <Card className="w-full">
        <h1 className="text-xl font-semibold">Zaproszenie do grupy</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Kliknij poniżej, aby dołączyć do ekipy.
        </p>
        <form
          action={async () => {
            "use server";
            await acceptInviteAction(token);
          }}
          className="mt-4"
        >
          <Button className="w-full">Akceptuję zaproszenie</Button>
        </form>
        <Link href="/login" className="mt-3 inline-block text-sm text-sky-700 underline">
          Wróć do logowania
        </Link>
      </Card>
    </main>
  );
}
