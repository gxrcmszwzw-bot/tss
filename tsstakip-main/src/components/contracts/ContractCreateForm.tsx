"use client";

import { SubmitButton } from "@/components/ui/SubmitButton";
import type { CustomerSite, Profile } from "@/lib/data";

export function ContractCreateForm({
  action,
  customerSites,
  members,
}: {
  action: (formData: FormData) => void | Promise<void>;
  customerSites: CustomerSite[];
  members: Profile[];
}) {
  return (
    <form action={action} className="grid gap-3 rounded-xl border border-border bg-panel p-4 md:grid-cols-2">
      <Field label="Sozlesme No" name="contract_no" required />
      <Field label="Sozlesme Tipi" name="contract_type" required />
      <Field label="Musteri Adi" name="customer_name" required />
      <Select label="Ana Site" name="primary_site_id">
        <option value="">Seciniz</option>
        {customerSites.map((site) => (
          <option key={site.id} value={site.id}>
            {site.site_code} · {site.customer_name}
          </option>
        ))}
      </Select>
      <Select label="Teknik Sorumlu" name="technical_owner_id">
        <option value="">Seciniz</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.full_name}
          </option>
        ))}
      </Select>
      <Select label="Ticari Sorumlu" name="commercial_owner_id">
        <option value="">Seciniz</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.full_name}
          </option>
        ))}
      </Select>
      <Field label="Baslangic" name="start_date" type="date" />
      <Field label="Bitis" name="end_date" type="date" />
      <Field label="Yenileme" name="renewal_date" type="date" />
      <Select label="Durum" name="status">
        <option value="draft">Taslak</option>
        <option value="approved">Onaylandi</option>
        <option value="active">Aktif</option>
        <option value="suspended">Askida</option>
        <option value="closed">Kapandi</option>
      </Select>
      <Select label="Yasam Dongusu" name="lifecycle_stage">
        <option value="draft">Taslak</option>
        <option value="approved">Onaylandi</option>
        <option value="installation_planned">Kurulum Planlandi</option>
        <option value="installation_in_progress">Kurulum Devam Ediyor</option>
        <option value="partially_live">Kismen Canli</option>
        <option value="live">Canli</option>
        <option value="support_phase">Destek Fazi</option>
      </Select>
      <label className="block md:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-foreground/75">Aktif Moduller</span>
        <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm">
          <Checkbox label="Kurulum" name="module_keys" value="installation" />
          <Checkbox label="Servis / Destek" name="module_keys" value="service_support" />
          <Checkbox label="Satin Alma / Stok" name="module_keys" value="procurement_stock" />
          <Checkbox label="IoT" name="module_keys" value="iot_operations" />
        </div>
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-foreground/75">Ozet</span>
        <textarea className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-accent" name="summary" />
      </label>
      <label className="block md:col-span-2">
        <span className="mb-1.5 block text-sm font-medium text-foreground/75">Notlar</span>
        <textarea className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-accent" name="notes" />
      </label>
      <div className="md:col-span-2">
        <SubmitButton label="Sozlesmeyi Olustur" pendingLabel="Olusturuluyor..." />
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/75">{label}</span>
      <input
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent"
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
}: {
  children: React.ReactNode;
  label: string;
  name: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/75">{label}</span>
      <select
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-accent"
        name={name}
      >
        {children}
      </select>
    </label>
  );
}

function Checkbox({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="inline-flex items-center gap-2">
      <input className="size-4" defaultChecked={value === "installation" || value === "service_support"} name={name} type="checkbox" value={value} />
      {label}
    </label>
  );
}
