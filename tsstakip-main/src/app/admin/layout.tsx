import { AppHeader, adminNav } from "@/components/layout/AppShell";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { OfflineSyncProvider } from "@/components/offline/OfflineSyncProvider";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <OfflineSyncProvider>
        <NavigationProgress />
        <div className="min-h-screen md:flex">
          <AppHeader nav={adminNav} />
          <main className="min-w-0 flex-1 px-5 py-6 md:px-8">{children}</main>
        </div>
      </OfflineSyncProvider>
    </div>
  );
}
