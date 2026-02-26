import { Spinner } from "@/components/ui/spinner";

export default function AppLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/15 p-4 backdrop-blur-[2px]">
      <div className="flex min-w-[180px] items-center justify-center gap-3 rounded-2xl border border-sky-100 bg-white px-5 py-4 shadow-xl">
        <Spinner className="size-5 text-sky-600" />
        <p className="text-sm font-semibold text-zinc-800">Ladowanie...</p>
      </div>
    </div>
  );
}
