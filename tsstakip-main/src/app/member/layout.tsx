import { redirect } from "next/navigation";

import { AppHeader, memberNav } from "@/components/layout/AppShell";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { OfflineSyncProvider } from "@/components/offline/OfflineSyncProvider";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireProfile();
  if (profile.role === "admin") redirect("/admin");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <OfflineSyncProvider>
        <NavigationProgress />
        <div className="min-h-screen md:flex">
          <AppHeader nav={memberNav} />
          <main className="min-w-0 flex-1 px-5 py-6 md:px-8">{children}</main>
        </div>
      </OfflineSyncProvider>
    </div>
  );
}
