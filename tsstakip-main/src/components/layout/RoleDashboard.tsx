import { ClipboardList, UsersRound } from "lucide-react";

import { SignOutButton } from "@/components/auth/SignOutButton";

type RoleDashboardProps = {
  title: string;
  description: string;
  roleLabel: string;
  highlights: Array<{
    label: string;
    value: string;
  }>;
};

export function RoleDashboard({
  title,
  description,
  roleLabel,
  highlights,
}: RoleDashboardProps) {
  return (
    <main className="min-h-screen bg-background px-5 py-6 text-foreground md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-accent text-white">
              {roleLabel === "Admin" ? (
                <UsersRound size={22} aria-hidden="true" />
              ) : (
                <ClipboardList size={22} aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-accent-strong">{roleLabel}</p>
              <h1 className="text-2xl font-semibold">{title}</h1>
            </div>
          </div>
          <SignOutButton />
        </header>

        <section className="py-8">
          <p className="max-w-2xl text-sm text-foreground/70">{description}</p>
          <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {highlights.map((item) => (
              <div
                className="rounded-lg border border-border bg-panel p-4"
                key={item.label}
              >
                <p className="text-sm text-foreground/70">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
