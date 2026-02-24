"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InviteLinkActions({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const href = `/invite/${token}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={href} className="text-xs text-sky-700 underline" target="_blank">
        Otworz link
      </Link>
      <Button
        type="button"
        variant="secondary"
        className="h-8 px-2 text-xs"
        onClick={async () => {
          const absoluteUrl = `${window.location.origin}${href}`;
          await navigator.clipboard.writeText(absoluteUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Skopiowano" : "Kopiuj link"}
      </Button>
    </div>
  );
}
