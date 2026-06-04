import { ClipboardList, Shield, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { LoginForm } from "@/components/auth/LoginForm";

const features: [LucideIcon, string, string][] = [
  [Shield, "Rol tabanlı erişim", "Admin ve üye ayrı paneller"],
  [ClipboardList, "Tam kayıt takibi", "Servis durumu, fotoğraf ve zaman"],
  [Users, "Ekip yönetimi", "Taşeron ve teknik ekip desteği"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-accent text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-0 md:grid-cols-[1fr_1fr]">
        {/* Left: Branding */}
        <div className="flex flex-col justify-center px-8 py-12 md:px-12">
          <div className="mb-8 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="TSS Takip" className="size-14 rounded-2xl" src="/icon.svg" />
            <div>
              <p className="text-sm font-medium text-white/70 uppercase tracking-widest">TSS Takip</p>
              <h1 className="text-2xl font-bold leading-tight">Servis Kayıt Yönetimi</h1>
            </div>
          </div>

          <h2 className="mb-6 max-w-sm text-4xl font-bold leading-tight md:text-5xl">
            Saha servis süreçlerinizi tek noktadan yönetin.
          </h2>

          <div className="space-y-4">
            {features.map(([Icon, title, desc]) => (
              <div className="flex items-start gap-3" key={title}>
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-white/65">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Login card */}
        <div className="flex items-center justify-center bg-background px-6 py-12 text-foreground md:rounded-none md:px-12">
          <div className="w-full max-w-sm">
            <h2 className="mb-1 text-2xl font-bold text-foreground">Giriş Yap</h2>
            <p className="mb-8 text-sm text-foreground/60">
              Hesabınızla devam edin
            </p>
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
