import Link from "next/link";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { NavLink } from "@/components/layout/NavLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export type NavItem = {
  href: string;
  label: string;
  children?: NavItem[];
};

type AppHeaderProps = {
  nav: NavItem[];
};

export function AppHeader({ nav }: AppHeaderProps) {
  const homeHref = nav[0]?.href ?? "/";

  return (
    <aside className="bg-accent text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col" style={{ boxShadow: "var(--shadow-md)" }}>
      <div className="flex items-center gap-4 px-5 py-4">
        <Link
          className="flex items-center gap-2.5 text-white/90 transition hover:text-white"
          href={homeHref}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="TSS Takip" className="size-8 rounded-md" src="/icon.svg" />
          <span className="hidden text-sm font-semibold tracking-wide sm:block">
            TSS Takip
          </span>
        </Link>

        <div className="flex-1" />

        <div className="hidden md:block">
          <ThemeToggle />
        </div>

        <div className="md:hidden">
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-y-auto md:px-3 md:py-2">
        {nav.map((item) => (
          <div key={item.href}>
            <NavLink href={item.href}>
              {item.label}
            </NavLink>
            {item.children?.length ? (
              <div className="mt-1 space-y-1 border-l border-white/15 pl-3 md:ml-4">
                {item.children.map((child) => (
                  <NavLink href={child.href} key={child.href} nested exact>
                    {child.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="hidden border-t border-white/15 p-3 md:block">
        <div className="flex items-center justify-between gap-3">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-foreground/60">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  {
    href: "/admin/services",
    label: "Servisler",
  },
  { href: "/admin/notifications", label: "Bildirimler" },
  { href: "/admin/finance-audit", label: "Finans Denetim" },
  { href: "/admin/ai-alerts", label: "AI Alarmlar" },
  { href: "/admin/reports", label: "Raporlar" },
  { href: "/admin/management", label: "Yönetim Paneli" },
];

export const memberNav: NavItem[] = [
  {
    href: "/member",
    label: "Servislerim",
  },
];
