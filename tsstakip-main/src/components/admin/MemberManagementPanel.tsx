import { UserPlus } from "lucide-react";

import {
  createMemberAction,
  deleteMemberAction,
  updateMemberAction,
} from "@/app/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Profile } from "@/lib/data";

type MemberManagementPanelProps = {
  members: Profile[];
  error?: string;
  ok?: string;
  returnTo?: "/admin/members" | "/admin/management";
};

export function MemberManagementPanel({
  members,
  error,
  ok,
  returnTo = "/admin/members",
}: MemberManagementPanelProps) {
  const admins = members.filter((member) => member.role === "admin").length;
  const active = members.filter((member) => member.is_active).length;
  const inactive = members.length - active;

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-lg border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          <strong>Hata:</strong> {decodeURIComponent(error)}
        </div>
      ) : null}
      {ok ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
          Üye başarıyla eklendi.
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Toplam Üye" value={String(members.length)} />
        <Metric label="Aktif" value={String(active)} />
        <Metric label="Admin" value={String(admins)} subValue={`${inactive} pasif`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <form
          action={createMemberAction}
          className="h-fit rounded-xl border border-border bg-panel p-5"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <input name="return_to" type="hidden" value={returnTo} />
          <div className="mb-4 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-accent text-white">
              <UserPlus size={16} aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold">Yeni Üye</h2>
              <p className="text-xs text-foreground/55">E-posta, şifre ve rol bilgisiyle hesap açılır.</p>
            </div>
          </div>
          <div className="space-y-3">
            <Input label="Ad Soyad" name="full_name" required />
            <Input label="E-posta" name="email" required type="email" />
            <Input label="Şifre" name="password" required type="password" />
            <Input label="Telefon" name="phone" />
            <Select label="Rol" name="role">
              <option value="member">Üye</option>
              <option value="admin">Admin</option>
            </Select>
            <SubmitButton
              className="h-11 w-full rounded-lg bg-accent text-sm font-semibold text-white shadow-sm transition active:scale-[0.97] hover:bg-accent-strong disabled:opacity-60"
              label="Üye Ekle"
              pendingLabel="Ekleniyor..."
            />
          </div>
        </form>

        <div className="rounded-xl border border-border bg-panel" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Üye Listesi</h2>
            <p className="text-xs text-foreground/55">Rol, telefon ve aktiflik bilgilerini buradan düzenleyebilirsiniz.</p>
          </div>
          <div className="space-y-2.5 p-3">
            {members.length === 0 ? (
              <p className="rounded-lg bg-panel-muted p-8 text-center text-sm text-foreground/50">
                Henüz üye yok.
              </p>
            ) : (
              members.map((member) => (
                <form
                  action={updateMemberAction}
                  className="rounded-lg border border-border bg-background p-3"
                  key={member.id}
                >
                  <input name="id" type="hidden" value={member.id} />
                  <input name="return_to" type="hidden" value={returnTo} />
                  <div className="grid gap-3 md:grid-cols-[1fr_150px_120px_80px_auto] md:items-end">
                    <Input label="Ad Soyad" name="full_name" value={member.full_name} />
                    <Input label="Telefon" name="phone" value={member.phone ?? ""} />
                    <Select label="Rol" name="role" value={member.role}>
                      <option value="member">Üye</option>
                      <option value="admin">Admin</option>
                    </Select>
                    <label className="flex h-11 items-center gap-2 text-sm">
                      <input className="h-4 w-4 accent-accent" defaultChecked={member.is_active} name="is_active" type="checkbox" />
                      Aktif
                    </label>
                    <div className="flex gap-2">
                      <SubmitButton
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium transition active:scale-95 hover:border-accent/40 hover:text-accent disabled:opacity-60"
                        label="Kaydet"
                        pendingLabel="Kaydediliyor..."
                      />
                      <SubmitButton
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/8 px-3 text-sm font-medium text-danger transition active:scale-95 hover:bg-danger/15 disabled:opacity-60"
                        formAction={deleteMemberAction}
                        label="Sil"
                        pendingLabel="Siliniyor..."
                      />
                    </div>
                  </div>
                </form>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <p className="text-2xl font-semibold">{value}</p>
        {subValue ? <p className="pb-1 text-xs text-foreground/50">{subValue}</p> : null}
      </div>
    </div>
  );
}

function Input({
  label,
  name,
  required,
  type = "text",
  value,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/75">{label}</span>
      <input
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
        defaultValue={value}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}

function Select({
  children,
  label,
  name,
  value,
}: {
  children: React.ReactNode;
  label: string;
  name: string;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/75">{label}</span>
      <select
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
        defaultValue={value}
        name={name}
      >
        {children}
      </select>
    </label>
  );
}
