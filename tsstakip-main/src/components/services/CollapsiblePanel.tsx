"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

type CollapsiblePanelProps = {
  title: string;
  count: number;
  children: React.ReactNode;
};

export function CollapsiblePanel({
  title,
  count,
  children,
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const contentId = useId();

  return (
    <section className="overflow-hidden rounded-xl bg-panel" style={{ boxShadow: "var(--shadow-sm)" }}>
      <button
        aria-controls={contentId}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between border-b border-border px-5 py-3.5 text-left"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <h2 className="font-semibold text-foreground">{title}</h2>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-panel-muted px-2.5 py-0.5 text-xs font-semibold text-foreground/60">
            {count}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`text-foreground/45 transition ${isOpen ? "rotate-180" : ""}`}
            size={18}
          />
        </span>
      </button>
      {isOpen ? (
        <div className="space-y-2.5 p-3" id={contentId}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
