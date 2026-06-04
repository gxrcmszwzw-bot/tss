"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
  nested?: boolean;
};

export function NavLink({ href, children, exact = false, nested = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href ||
    (!exact && href !== "/admin" && href !== "/member" && pathname.startsWith(href));

  return (
    <Link
      className={`relative flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
        nested ? "h-9 text-xs" : ""
      } ${
        isActive ? "bg-white/15 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"
      }`}
      href={href}
      prefetch
    >
      {children}
      <span
        className={`absolute inset-y-2 left-0 w-0.5 rounded-full bg-white transition-all duration-200 ${
          isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-50"
        }`}
      />
    </Link>
  );
}
