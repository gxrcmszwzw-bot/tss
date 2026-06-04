"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";

const options = [
  { value: "light", label: "Açık", icon: Sun },
  { value: "dark", label: "Koyu", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 p-1">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;

        return (
          <button
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
              isActive
                ? "bg-white text-accent shadow-sm"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
            key={option.value}
            onClick={() => setTheme(option.value)}
            type="button"
          >
            <Icon size={14} aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
      <span className="hidden px-2 text-[11px] text-white/65 md:inline">
        {resolvedTheme === "dark" ? "Koyu aktif" : "Açık aktif"}
      </span>
    </div>
  );
}
