import { Fish } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export default function AppLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/15 p-4 backdrop-blur-[2px]">
      <div className="flex min-w-[220px] items-center gap-3 rounded-2xl border border-sky-100 bg-white px-5 py-4 shadow-xl">
        <div className="relative">
          <Fish className="size-5 text-sky-600" />
          <Spinner className="absolute -right-2 -top-2 size-3 text-cyan-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-800">Trwa ladowanie</p>
          <p className="text-xs text-zinc-500">Za chwile bedziesz na miejscu.</p>
        </div>
      </div>
    </div>
  );
}
