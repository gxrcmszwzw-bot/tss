"use client";

import { Loader2 } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = ComponentPropsWithoutRef<"button"> & {
  label?: ReactNode;
  pendingLabel?: ReactNode;
  showSpinner?: boolean;
};

export function SubmitButton({
  label,
  pendingLabel = "Kaydediliyor...",
  children,
  className = "inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60",
  disabled,
  showSpinner = true,
  type = "submit",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const content = pending ? pendingLabel : (children ?? label);

  return (
    <button className={className} disabled={disabled || pending} type={type} {...props}>
      {pending && showSpinner ? (
        <Loader2 className="animate-spin" size={15} aria-hidden="true" />
      ) : null}
      {content}
    </button>
  );
}
