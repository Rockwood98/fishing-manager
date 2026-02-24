import { Spinner } from "@/components/ui/spinner";

export default function AppLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
        <Spinner className="size-4 text-sky-600" />
        Ladowanie widoku...
      </div>
    </div>
  );
}
