import { Plus, Trash2 } from "lucide-react";

import {
  createCatalogItemAction,
  createCatalogPriceVersionAction,
  createCustomerSiteAction,
  createNotificationTemplateAction,
  createRegionAction,
  createRegionalPriceMultiplierAction,
  createProductGroupAction,
  createServiceTypeAction,
  sendNotificationTemplateTestAction,
  createSubcontractorAction,
  deleteCustomerSiteAction,
  deleteCatalogItemAction,
  deleteNotificationTemplateAction,
  deleteRegionAction,
  deleteRegionalPriceMultiplierAction,
  deleteProductGroupAction,
  deleteServiceTypeAction,
  deleteSubcontractorAction,
  importCustomerSitesFromExcelAction,
  importSubcontractorsFromExcelAction,
  syncCustomerSitesFromAirtableAction,
  togglePriorityAction,
  updateCatalogItemAction,
  updateCustomerSiteAction,
  updateNotificationTemplateAction,
  updateRegionAction,
  updateRegionalPriceMultiplierAction,
  updatePhotoRulesAction,
  updateProductGroupAction,
  updateServiceTypeAction,
  updateSubcontractorAction,
} from "@/app/actions";
import { PageHeader } from "@/components/layout/AppShell";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireAdmin } from "@/lib/auth";
import { formatCurrency, formatDateTime, notificationChannelLabels, priorityLabels } from "@/lib/labels";
import type {
  CatalogItem,
  CatalogPriceVersion,
  CustomerSite,
  NotificationTemplate,
  ProductGroup,
  Region,
  RegionalPriceMultiplier,
  ServiceType,
  Subcontractor,
} from "@/lib/data";
import { getTurkeyDistrictsByCityCode, TURKEY_CITIES } from "@/lib/turkey-locations";

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const [products, types, priorities, subcontractors, photoRules, catalogItems, catalogPriceVersions, regions, multipliers, notificationTemplates, customerSites] =
    await Promise.all([
      supabase.from("product_groups").select("*").order("name"),
      supabase.from("service_types").select("*").order("name"),
      supabase.from("priority_settings").select("*").order("sort_order"),
      supabase.from("subcontractors").select("*").order("name"),
      supabase.from("photo_rules").select("*").limit(1).single(),
      supabase.from("catalog_items").select("*").order("name"),
      supabase.from("catalog_price_versions").select("*").order("effective_from", { ascending: false }),
      supabase.from("regions").select("*").order("name"),
      supabase.from("regional_price_multipliers").select("*").order("effective_from", { ascending: false }),
      supabase.from("notification_templates").select("*").order("event_key").order("channel"),
      supabase.from("customer_sites").select("*").order("site_code"),
    ]);

  return (
    <>
      <PageHeader subtitle="Ürün, servis tipi, taşeron, şehir bazlı finans, müşteri/site ve bildirim ayarları" title="Ayarlar" />
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Ürün Grupları */}
        <Panel title="Ürün Grupları">
          <AddForm action={createProductGroupAction} placeholder="Yeni ürün grubu adı" />
          <div className="mt-4 space-y-2">
            {(products.data ?? []).length === 0 ? (
              <Empty />
            ) : (
              (products.data ?? []).map((item) => (
                <ProductGroupRow key={item.id} item={item} />
              ))
            )}
          </div>
        </Panel>

        {/* Servis Tipleri */}
        <Panel title="Servis Tipleri">
          <form action={createServiceTypeAction} className="space-y-2">
            <div className="flex gap-2">
              <input
                className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
                name="name"
                placeholder="Yeni servis tipi adı"
                required
              />
              <select
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                name="product_group_id"
              >
                <option value="">Ürün grubu yok</option>
                {(products.data ?? []).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <SubmitButton
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-strong"
                pendingLabel={null}
              >
                <Plus size={18} aria-hidden="true" />
              </SubmitButton>
            </div>
          </form>
          <div className="mt-4 space-y-2">
            {(types.data ?? []).length === 0 ? (
              <Empty />
            ) : (
              (types.data ?? []).map((item) => (
                <ServiceTypeRow key={item.id} item={item} products={products.data ?? []} />
              ))
            )}
          </div>
        </Panel>

        {/* Öncelikler */}
        <Panel title="Öncelikler">
          <div className="space-y-2">
            {(priorities.data ?? []).map((item) => (
              <form
                action={togglePriorityAction}
                className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                key={item.priority}
              >
                <input name="priority" type="hidden" value={item.priority} />
                <span className="text-sm font-medium">{priorityLabels[item.priority]}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-foreground/70">
                    <input
                      className="h-4 w-4 accent-accent"
                      defaultChecked={item.is_active}
                      name="is_active"
                      type="checkbox"
                    />
                    Aktif
                  </label>
                  <SubmitButton
                    className="h-8 rounded-md border border-border bg-panel px-3 text-xs font-medium hover:border-accent/40 hover:text-accent disabled:opacity-50"
                    label="Kaydet"
                    pendingLabel="..."
                  />
                </div>
              </form>
            ))}
          </div>
        </Panel>

        {/* Taşeron Firmalar */}
        <Panel title="Taşeron Firmalar">
          <form action={createSubcontractorAction} className="grid gap-2 md:grid-cols-2">
            <input
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="name"
              placeholder="Firma adı"
              required
            />
            <input
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="contact_name"
              placeholder="Sorumlu kişi"
            />
            <input
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="phone"
              placeholder="Telefon"
            />
            <select
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="city_code"
            >
              <option value="">Şehir seç</option>
              {TURKEY_CITIES.map((city) => (
                <option key={city.code} value={city.code}>{city.name}</option>
              ))}
            </select>
            <SubmitButton
              className="md:col-span-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-strong"
              pendingLabel="Ekleniyor..."
            >
              <Plus size={16} aria-hidden="true" />
              Taşeron Ekle
            </SubmitButton>
          </form>
          <form action={importSubcontractorsFromExcelAction} className="mt-3 grid gap-2 rounded-lg border border-dashed border-border bg-panel-muted/40 p-3">
            <p className="text-xs text-foreground/60">
              Excel kolonları: `Firma Adı`, `Sorumlu`, `Telefon`, `Şehir` veya `Şehir Kodu`
            </p>
            <a
              className="text-xs font-medium text-accent underline-offset-2 hover:underline"
              href="/templates/subcontractor-import-template.csv"
              target="_blank"
            >
              Örnek taşeron import şablonunu indir
            </a>
            <input
              accept=".xlsx,.xls,.csv"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              name="file"
              required
              type="file"
            />
            <SubmitButton
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-panel text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
              label="Excel ile Taşeron Yükle"
              pendingLabel="Yükleniyor..."
            />
          </form>
          <div className="mt-4 space-y-2">
            {(subcontractors.data ?? []).length === 0 ? (
              <Empty />
            ) : (
              (subcontractors.data ?? []).map((item) => (
                <SubcontractorRow key={item.id} item={item} />
              ))
            )}
          </div>
        </Panel>

        <Panel title="Finans Katalogu">
          <form action={createCatalogItemAction} className="grid gap-2 md:grid-cols-3">
            <input
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="name"
              placeholder="İş kalemi adı"
              required
            />
            <input
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="code"
              placeholder="Kod"
              required
            />
            <input
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="unit"
              placeholder="Birim"
            />
            <SubmitButton
              className="md:col-span-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-strong"
              pendingLabel="Ekleniyor..."
            >
              <Plus size={16} aria-hidden="true" />
              İş Kalemi Ekle
            </SubmitButton>
          </form>
          <div className="mt-4 space-y-2">
            {(catalogItems.data ?? []).length === 0 ? (
              <Empty />
            ) : (
              (catalogItems.data ?? []).map((item) => (
                <CatalogItemRow
                  item={item}
                  key={item.id}
                  priceVersions={(catalogPriceVersions.data ?? []).filter((version) => version.catalog_item_id === item.id)}
                />
              ))
            )}
          </div>
        </Panel>

        <Panel title="Şehir Bazlı Çarpanlar">
          <form action={createRegionAction} className="grid gap-2 md:grid-cols-[1fr_auto]">
            <select
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="city_code"
              required
            >
              <option value="">Türkiye şehri seç</option>
              {TURKEY_CITIES.map((city) => (
                <option key={city.code} value={city.code}>{city.name}</option>
              ))}
            </select>
            <SubmitButton
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong"
              pendingLabel="Ekleniyor..."
            >
              <Plus size={16} aria-hidden="true" />
              Şehri Aktifleştir
            </SubmitButton>
          </form>
          <div className="mt-4 space-y-2">
            {(regions.data ?? []).length === 0 ? <Empty /> : (regions.data ?? []).map((item) => (
              <RegionRow key={item.id} item={item} />
            ))}
          </div>
          <form action={createRegionalPriceMultiplierAction} className="mt-5 grid gap-2 border-t border-border pt-4 md:grid-cols-2">
            <select
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="city_code"
              required
            >
              <option value="">Şehir seç</option>
              {TURKEY_CITIES.map((city) => (
                <option key={city.code} value={city.code}>{city.name}</option>
              ))}
            </select>
            <select
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="catalog_item_id"
              required
            >
              <option value="">İş kalemi seç</option>
              {(catalogItems.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <input
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="multiplier"
              placeholder="Çarpan"
              required
              step="0.01"
              type="number"
            />
            <input
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              name="effective_from"
              required
              type="datetime-local"
            />
            <SubmitButton
              className="md:col-span-2 flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-panel text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
              label="Şehir Çarpanı Ekle"
              pendingLabel="Ekleniyor..."
            />
          </form>
          <div className="mt-4 space-y-1">
            {(multipliers.data ?? []).slice(0, 8).map((item) => (
              <MultiplierRow
                catalogItems={catalogItems.data ?? []}
                item={item}
                key={item.id}
                regions={regions.data ?? []}
              />
            ))}
          </div>
        </Panel>

        <Panel title="Müşteri ve Site Bilgileri">
          <div className="mb-4 flex flex-wrap gap-2">
            <form action={syncCustomerSitesFromAirtableAction}>
              <SubmitButton
                className="flex h-10 items-center justify-center rounded-lg border border-border bg-panel px-4 text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
                label="Airtable'dan Senkronize Et"
                pendingLabel="Senkronize ediliyor..."
              />
            </form>
          </div>
          <div className="mb-4 rounded-lg border border-border bg-panel-muted/40 p-3 text-xs text-foreground/65">
            <p className="font-medium text-foreground">Airtable entegrasyonu</p>
            <p className="mt-1">
              Butonlu senkron için `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_CUSTOMER_SITES_TABLE_ID` tanımlanmalı.
            </p>
            <p className="mt-1">
              Doğrudan webhook/script akışı için endpoint:
              <code className="ml-1 rounded bg-background px-1.5 py-0.5">/api/integrations/airtable/customer-sites</code>
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <a
                className="font-medium text-accent underline-offset-2 hover:underline"
                href="/templates/airtable-customer-site-payload-example.json"
                target="_blank"
              >
                Örnek Airtable payload dosyasını indir
              </a>
            </div>
          </div>
          <form action={importCustomerSitesFromExcelAction} className="mb-4 grid gap-2 rounded-lg border border-dashed border-border bg-panel-muted/40 p-3">
            <p className="text-xs text-foreground/60">
              Excel kolonları: `Site Code`, `Customer Name`, `Customer Phone`, `Address`, `Şehir`, `İlçe`, `Project Name`
            </p>
            <a
              className="text-xs font-medium text-accent underline-offset-2 hover:underline"
              href="/templates/customer-site-import-template.csv"
              target="_blank"
            >
              Örnek müşteri/site import şablonunu indir
            </a>
            <input
              accept=".xlsx,.xls,.csv"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              name="file"
              required
              type="file"
            />
            <SubmitButton
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-panel text-sm font-semibold text-foreground hover:border-accent/40 hover:text-accent"
              label="Excel ile Müşteri / Site Yükle"
              pendingLabel="Yükleniyor..."
            />
          </form>
          <form action={createCustomerSiteAction} className="grid gap-2 md:grid-cols-2">
            <input className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" name="site_code" placeholder="Site ID / Kod" required />
            <input className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" name="site_name" placeholder="Site adı" />
            <input className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" name="customer_name" placeholder="Müşteri adı" required />
            <input className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" name="customer_phone" placeholder="Müşteri telefonu" />
            <input className="md:col-span-2 h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" name="address" placeholder="Adres" />
            <select className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" name="city_code">
              <option value="">Şehir seç</option>
              {TURKEY_CITIES.map((city) => (
                <option key={city.code} value={city.code}>{city.name}</option>
              ))}
            </select>
            <input className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" name="district_name" placeholder="İlçe" />
            <input className="md:col-span-2 h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent" name="project_name" placeholder="Proje adı" />
            <SubmitButton
              className="md:col-span-2 flex h-10 items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-strong"
              pendingLabel="Kaydediliyor..."
            >
              <Plus size={16} aria-hidden="true" />
              Müşteri / Site Ekle
            </SubmitButton>
          </form>
          <div className="mt-4 space-y-2">
            {(customerSites.data ?? []).length === 0 ? (
              <Empty />
            ) : (
              (customerSites.data ?? []).map((item) => (
                <CustomerSiteRow key={item.id} item={item} />
              ))
            )}
          </div>
        </Panel>

        {/* Fotoğraf Kuralları */}
        <Panel title="Fotoğraf Kuralları">
          <form action={updatePhotoRulesAction} className="space-y-2">
            {[
              ["require_start_photo", "Başlangıç fotoğrafı zorunlu"],
              ["require_end_photo", "Bitiş fotoğrafı zorunlu"],
              ["camera_only", "Yalnızca kameradan çekim"],
              ["gallery_upload_enabled", "Galeriden yükleme"],
            ].map(([name, label]) => (
              <label
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background px-4 py-3 text-sm"
                key={name}
              >
                <span>{label}</span>
                <input
                  className="h-4 w-4 accent-accent"
                  defaultChecked={Boolean(photoRules.data?.[name as keyof typeof photoRules.data])}
                  name={name}
                  type="checkbox"
                />
              </label>
            ))}
            <SubmitButton
              className="mt-2 h-10 w-full rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
              label="Kuralları Kaydet"
              pendingLabel="Kaydediliyor..."
            />
          </form>
        </Panel>

        <Panel title="Bildirim Şablonları">
          <form action={createNotificationTemplateAction} className="grid gap-2">
            <div className="grid gap-2 md:grid-cols-3">
              <input
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                name="event_key"
                placeholder="Event key"
                required
              />
              <select
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                name="channel"
              >
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              <input
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                name="template_name"
                placeholder="Şablon adı"
                required
              />
            </div>
            <textarea
              className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              name="body_template"
              placeholder="Merhaba {{customer_name}}, servis {{service_number}} başladı."
              required
            />
            <SubmitButton
              className="flex h-10 items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-strong"
              pendingLabel="Ekleniyor..."
            >
              <Plus size={16} aria-hidden="true" />
              Şablon Ekle
            </SubmitButton>
          </form>
          <div className="mt-4 space-y-2">
            {(notificationTemplates.data ?? []).length === 0 ? (
              <Empty />
            ) : (
              (notificationTemplates.data ?? []).map((item) => (
                <NotificationTemplateRow item={item} key={item.id} />
              ))
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

function CatalogItemRow({
  item,
  priceVersions,
}: {
  item: CatalogItem;
  priceVersions: CatalogPriceVersion[];
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-start gap-2">
        <form action={updateCatalogItemAction} className="grid flex-1 gap-2 md:grid-cols-[1fr_120px_120px_auto]">
          <input name="id" type="hidden" value={item.id} />
          <input
            className="h-9 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition hover:border-border focus:border-accent focus:bg-panel"
            defaultValue={item.name}
            name="name"
            required
          />
          <input
            className="h-9 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition hover:border-border focus:border-accent focus:bg-panel"
            defaultValue={item.code}
            name="code"
            required
          />
          <input
            className="h-9 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition hover:border-border focus:border-accent focus:bg-panel"
            defaultValue={item.unit ?? ""}
            name="unit"
            placeholder="Birim"
          />
          <SubmitButton
            className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-medium hover:border-accent/40 hover:text-accent"
            label="Kaydet"
            pendingLabel="..."
          />
        </form>
        <form action={deleteCatalogItemAction}>
          <input name="id" type="hidden" value={item.id} />
          <SubmitButton
            className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/40 hover:bg-danger/10 hover:text-danger"
            pendingLabel={null}
            title="Sil"
          >
            <Trash2 size={15} aria-hidden="true" />
          </SubmitButton>
        </form>
      </div>

      <form action={createCatalogPriceVersionAction} className="mt-3 grid gap-2 md:grid-cols-[1fr_120px_160px_90px_auto]">
        <input name="catalog_item_id" type="hidden" value={item.id} />
        <input
          className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent"
          name="base_price"
          placeholder="Baz fiyat"
          required
          step="0.01"
          type="number"
        />
        <input
          className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent"
          name="effective_from"
          required
          type="datetime-local"
        />
        <input
          className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent"
          defaultValue="TRY"
          name="currency"
        />
        <SubmitButton
          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-panel px-3 text-xs font-medium hover:border-accent/40 hover:text-accent"
          label="Fiyat Ekle"
          pendingLabel="..."
        />
      </form>

      {priceVersions.length > 0 ? (
        <div className="mt-3 space-y-1">
          {priceVersions.slice(0, 3).map((version) => (
            <div className="flex items-center justify-between rounded-md bg-panel-muted px-2 py-1.5 text-xs" key={version.id}>
              <span>{formatCurrency(version.base_price, version.currency)}</span>
              <span className="text-foreground/60">{formatDateTime(version.effective_from)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-foreground/55">Henüz fiyat versiyonu yok.</p>
      )}
    </div>
  );
}

function RegionRow({ item }: { item: Region }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <form action={updateRegionAction} className="grid flex-1 gap-2 md:grid-cols-[1fr_120px_auto]">
        <input name="id" type="hidden" value={item.id} />
        <input
          className="h-9 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition hover:border-border focus:border-accent focus:bg-panel"
          defaultValue={item.name}
          name="name"
          required
        />
        <input
          className="h-9 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition hover:border-border focus:border-accent focus:bg-panel"
          defaultValue={item.code}
          name="code"
          required
        />
        <SubmitButton
          className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-medium hover:border-accent/40 hover:text-accent"
          label="Kaydet"
          pendingLabel="..."
        />
      </form>
      <form action={deleteRegionAction}>
        <input name="id" type="hidden" value={item.id} />
        <SubmitButton
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/40 hover:bg-danger/10 hover:text-danger"
          pendingLabel={null}
          title="Sil"
        >
          <Trash2 size={15} aria-hidden="true" />
        </SubmitButton>
      </form>
    </div>
  );
}

function MultiplierRow({
  catalogItems,
  item,
  regions,
}: {
  catalogItems: CatalogItem[];
  item: RegionalPriceMultiplier;
  regions: Region[];
}) {
  const region = regions.find((entry) => entry.id === item.region_id);
  const catalogItem = catalogItems.find((entry) => entry.id === item.catalog_item_id);

  return (
    <div className="rounded-md bg-panel-muted px-3 py-2 text-xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span>{region?.name ?? "Şehir"} · {catalogItem?.name ?? "İş kalemi"}</span>
        <form action={deleteRegionalPriceMultiplierAction}>
          <input name="id" type="hidden" value={item.id} />
          <SubmitButton
            className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/40 hover:bg-danger/10 hover:text-danger"
            pendingLabel={null}
            title="Sil"
          >
            <Trash2 size={13} aria-hidden="true" />
          </SubmitButton>
        </form>
      </div>
      <form action={updateRegionalPriceMultiplierAction} className="grid gap-2 md:grid-cols-[120px_1fr_auto]">
        <input name="id" type="hidden" value={item.id} />
        <input
          className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-accent"
          defaultValue={item.multiplier}
          name="multiplier"
          step="0.01"
          type="number"
        />
        <input
          className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-accent"
          defaultValue={item.effective_from.slice(0, 16)}
          name="effective_from"
          type="datetime-local"
        />
        <SubmitButton
          className="inline-flex h-8 items-center justify-center rounded-md border border-border px-3 text-xs font-medium hover:border-accent/40 hover:text-accent"
          label="Kaydet"
          pendingLabel="..."
        />
      </form>
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="overflow-hidden rounded-xl bg-panel" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function AddForm({
  action,
  placeholder,
}: {
  action: (formData: FormData) => void | Promise<void>;
  placeholder: string;
}) {
  return (
    <form action={action} className="flex gap-2">
      <input
        className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
        name="name"
        placeholder={placeholder}
        required
      />
      <SubmitButton
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-white hover:bg-accent-strong"
        pendingLabel={null}
      >
        <Plus size={18} aria-hidden="true" />
      </SubmitButton>
    </form>
  );
}

function Empty() {
  return (
    <p className="rounded-lg bg-panel-muted px-3 py-4 text-center text-sm text-foreground/50">
      Henüz kayıt yok.
    </p>
  );
}

function NotificationTemplateRow({ item }: { item: NotificationTemplate }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-foreground/60">
          {item.event_key} · {notificationChannelLabels[item.channel]}
        </span>
        <form action={deleteNotificationTemplateAction}>
          <input name="id" type="hidden" value={item.id} />
          <SubmitButton
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/40 hover:bg-danger/10 hover:text-danger"
            pendingLabel={null}
            title="Sil"
          >
            <Trash2 size={15} aria-hidden="true" />
          </SubmitButton>
        </form>
      </div>
      <form action={updateNotificationTemplateAction} className="grid gap-2">
        <input name="id" type="hidden" value={item.id} />
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent"
            defaultValue={item.event_key}
            name="event_key"
            required
          />
          <select
            className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent"
            defaultValue={item.channel}
            name="channel"
          >
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <input
            className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent"
            defaultValue={item.template_name}
            name="template_name"
            required
          />
        </div>
        <textarea
          className="min-h-20 rounded-md border border-border bg-panel px-2 py-2 text-sm outline-none focus:border-accent"
          defaultValue={item.body_template}
          name="body_template"
          required
        />
        <label className="flex items-center gap-2 text-sm text-foreground/70">
          <input
            className="h-4 w-4 accent-accent"
            defaultChecked={item.is_active}
            name="is_active"
            type="checkbox"
          />
          Aktif
        </label>
        <SubmitButton
          className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-medium hover:border-accent/40 hover:text-accent"
          label="Şablonu Kaydet"
          pendingLabel="..."
        />
      </form>
      <form action={sendNotificationTemplateTestAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input name="template_id" type="hidden" value={item.id} />
        <input
          className="h-9 flex-1 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent"
          name="recipient"
          placeholder={item.channel === "sms" ? "+90555..." : "WhatsApp alicisi"}
          required
        />
        <SubmitButton
          className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-medium hover:border-accent/40 hover:text-accent"
          label="Test Gonder"
          pendingLabel="Gonderiliyor..."
        />
      </form>
    </div>
  );
}

function ProductGroupRow({ item }: { item: ProductGroup }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <form action={updateProductGroupAction} className="flex flex-1 items-center gap-2">
        <input name="id" type="hidden" value={item.id} />
        <input
          className="h-9 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition hover:border-border focus:border-accent focus:bg-panel focus:ring-1 focus:ring-accent/20"
          defaultValue={item.name}
          name="name"
          required
        />
        <SubmitButton
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/40 hover:text-accent disabled:opacity-60"
          label="Kaydet"
          pendingLabel="Kaydediliyor..."
        />
      </form>
      <form action={deleteProductGroupAction}>
        <input name="id" type="hidden" value={item.id} />
        <SubmitButton
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/40 hover:bg-danger/10 hover:text-danger"
          pendingLabel={null}
          title="Sil"
        >
          <Trash2 size={15} aria-hidden="true" />
        </SubmitButton>
      </form>
    </div>
  );
}

function ServiceTypeRow({ item, products }: { item: ServiceType; products: ProductGroup[] }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <form action={updateServiceTypeAction} className="flex flex-1 items-center gap-2">
        <input name="id" type="hidden" value={item.id} />
        <input
          className="h-9 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition hover:border-border focus:border-accent focus:bg-panel focus:ring-1 focus:ring-accent/20"
          defaultValue={item.name}
          name="name"
          required
        />
        <select
          className="h-9 rounded-md border border-transparent bg-transparent px-2 text-xs outline-none hover:border-border focus:border-accent focus:bg-panel"
          defaultValue={item.product_group_id ?? ""}
          name="product_group_id"
        >
          <option value="">Grup yok</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <SubmitButton
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/40 hover:text-accent disabled:opacity-60"
          label="Kaydet"
          pendingLabel="Kaydediliyor..."
        />
      </form>
      <form action={deleteServiceTypeAction}>
        <input name="id" type="hidden" value={item.id} />
        <SubmitButton
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/40 hover:bg-danger/10 hover:text-danger"
          pendingLabel={null}
          title="Sil"
        >
          <Trash2 size={15} aria-hidden="true" />
        </SubmitButton>
      </form>
    </div>
  );
}

function SubcontractorRow({ item }: { item: Subcontractor }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <form action={updateSubcontractorAction} className="grid flex-1 gap-2 md:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
        <input name="id" type="hidden" value={item.id} />
        <input
          className="h-9 rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition hover:border-border focus:border-accent focus:bg-panel focus:ring-1 focus:ring-accent/20"
          defaultValue={item.name}
          name="name"
          required
        />
        <input
          className="h-9 rounded-md border border-transparent bg-transparent px-2 text-xs outline-none hover:border-border focus:border-accent focus:bg-panel"
          defaultValue={item.contact_name ?? ""}
          name="contact_name"
          placeholder="Sorumlu"
        />
        <input
          className="h-9 rounded-md border border-transparent bg-transparent px-2 text-xs outline-none hover:border-border focus:border-accent focus:bg-panel"
          defaultValue={item.phone ?? ""}
          name="phone"
          placeholder="Telefon"
        />
        <select
          className="h-9 rounded-md border border-transparent bg-transparent px-2 text-xs outline-none hover:border-border focus:border-accent focus:bg-panel"
          defaultValue={item.city_code ?? ""}
          name="city_code"
        >
          <option value="">Şehir</option>
          {TURKEY_CITIES.map((city) => (
            <option key={city.code} value={city.code}>{city.name}</option>
          ))}
        </select>
        <SubmitButton
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-accent/40 hover:text-accent disabled:opacity-60"
          label="Kaydet"
          pendingLabel="Kaydediliyor..."
        />
      </form>
      <form action={deleteSubcontractorAction}>
        <input name="id" type="hidden" value={item.id} />
        <SubmitButton
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/40 hover:bg-danger/10 hover:text-danger"
          pendingLabel={null}
          title="Sil"
        >
          <Trash2 size={15} aria-hidden="true" />
        </SubmitButton>
      </form>
    </div>
  );
}

function CustomerSiteRow({ item }: { item: CustomerSite }) {
  const districts = getTurkeyDistrictsByCityCode(item.city_code);

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 text-xs text-foreground/60">
        {item.site_code} · {item.source} {item.airtable_record_id ? "· airtable" : ""}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <form action={updateCustomerSiteAction} className="contents">
          <input name="id" type="hidden" value={item.id} />
          <input className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent" defaultValue={item.site_code} name="site_code" required />
          <input className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent" defaultValue={item.site_name ?? ""} name="site_name" placeholder="Site adı" />
          <input className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent" defaultValue={item.customer_name} name="customer_name" required />
          <input className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent" defaultValue={item.customer_phone ?? ""} name="customer_phone" placeholder="Telefon" />
          <input className="md:col-span-2 h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent" defaultValue={item.address ?? ""} name="address" placeholder="Adres" />
          <select className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent" defaultValue={item.city_code ?? ""} name="city_code">
            <option value="">Şehir seç</option>
            {TURKEY_CITIES.map((city) => (
              <option key={city.code} value={city.code}>{city.name}</option>
            ))}
          </select>
          <select className="h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent" defaultValue={item.district_name ?? ""} name="district_name">
            <option value="">İlçe seç</option>
            {districts.map((district) => (
              <option key={district.code} value={district.name}>{district.name}</option>
            ))}
          </select>
          <input className="md:col-span-2 h-9 rounded-md border border-border bg-panel px-2 text-sm outline-none focus:border-accent" defaultValue={item.project_name ?? ""} name="project_name" placeholder="Proje adı" />
          <label className="md:col-span-2 flex items-center gap-2 text-sm text-foreground/70">
            <input className="h-4 w-4 accent-accent" defaultChecked={item.is_active} name="is_active" type="checkbox" />
            Aktif
          </label>
          <div className="md:col-span-2 flex items-center gap-2">
            <SubmitButton
              className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs font-medium hover:border-accent/40 hover:text-accent"
              label="Kaydet"
              pendingLabel="Kaydediliyor..."
            />
          </div>
        </form>
        <div className="md:col-span-2">
          <form action={deleteCustomerSiteAction}>
            <input name="id" type="hidden" value={item.id} />
            <SubmitButton
              className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/40 hover:bg-danger/10 hover:text-danger"
              pendingLabel={null}
              title="Sil"
            >
              <Trash2 size={15} aria-hidden="true" />
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
