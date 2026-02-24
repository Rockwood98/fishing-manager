"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  idleText: string;
  pendingText?: string;
  className?: string;
  variant?: "default" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
};

export function LoadingSubmitButton({
  idleText,
  pendingText = "Zapisywanie...",
  className,
  variant = "default",
  disabled = false,
}: Props) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <Button type="submit" variant={variant} className={className} disabled={isDisabled}>
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <Spinner className="size-3.5" />
          {pendingText}
        </span>
      ) : (
        idleText
      )}
    </Button>
  );
}
