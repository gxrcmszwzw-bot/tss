import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { requireAdmin } from "@/lib/auth";
import { feeLabels, priorityLabels, statusLabels } from "@/lib/labels";
import { inRange, resolvePeriod } from "@/lib/reports";

export async function GET(request: Request) {
  const { supabase } = await requireAdmin();
  const url = new URL(request.url);
  const period = url.searchParams.get("period") ?? "month";
  const fromParam = url.searchParams.get("from") ?? undefined;
  const toParam = url.searchParams.get("to") ?? undefined;
  const { range } = resolvePeriod(period, fromParam, toParam);

  const [services, products, types, members, subcontractors] = await Promise.all([
    supabase.from("services").select("*").order("created_at", { ascending: false }),
    supabase.from("product_groups").select("id,name"),
    supabase.from("service_types").select("id,name"),
    supabase.from("profiles").select("id,full_name"),
    supabase.from("subcontractors").select("id,name"),
  ]);

  const productMap = new Map((products.data ?? []).map((p) => [p.id, p.name]));
  const typeMap = new Map((types.data ?? []).map((t) => [t.id, t.name]));
  const memberMap = new Map((members.data ?? []).map((m) => [m.id, m.full_name]));
  const subMap = new Map((subcontractors.data ?? []).map((s) => [s.id, s.name]));

  const filtered = (services.data ?? []).filter((service) =>
    inRange(service.created_at, range),
  );

  // Sheet 1: details
  const detailRows = filtered.map((s) => ({
    "Müşteri": s.customer_name,
    "Telefon": s.customer_phone,
    "Adres": s.address,
    "İlçe": s.district ?? "",
    "Site ID": s.site_id,
    "Proje": s.project_name ?? "",
    "Ürün Grubu": s.product_group_id ? (productMap.get(s.product_group_id) ?? "") : "",
    "Servis Tipi": s.service_type_id ? (typeMap.get(s.service_type_id) ?? "") : "",
    "Üye": s.member_id ? (memberMap.get(s.member_id) ?? "") : "",
    "Taşeron": s.subcontractor_id ? (subMap.get(s.subcontractor_id) ?? "") : "",
    "Öncelik": priorityLabels[s.priority],
    "Durum": statusLabels[s.status],
    "Ücretlendirme": feeLabels[s.fee_type],
    "Tutar": s.amount ?? "",
    "Para Birimi": s.currency,
    "Planlanan": s.scheduled_at ? new Date(s.scheduled_at).toLocaleString("tr-TR") : "",
    "Başlangıç": s.started_at ? new Date(s.started_at).toLocaleString("tr-TR") : "",
    "Bitiş": s.completed_at ? new Date(s.completed_at).toLocaleString("tr-TR") : "",
    "Oluşturulma": new Date(s.created_at).toLocaleString("tr-TR"),
  }));

  // Sheet 2: summary
  const total = filtered.length;
  const paid = filtered.filter((s) => s.fee_type === "paid").length;
  const free = filtered.filter((s) => s.fee_type === "free").length;
  const warranty = filtered.filter((s) => s.fee_type === "warranty").length;
  const totalRevenue = filtered
    .filter((s) => s.fee_type === "paid" && s.amount)
    .reduce((sum, s) => sum + (s.amount ?? 0), 0);

  const cityCounts = new Map<string, number>();
  for (const s of filtered) {
    if (s.district) cityCounts.set(s.district, (cityCounts.get(s.district) ?? 0) + 1);
  }
  const topCities = Array.from(cityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const summaryRows = [
    { "Metrik": "Dönem", "Değer": range.label },
    { "Metrik": "Toplam Servis", "Değer": total },
    { "Metrik": "Ücretsiz Servis", "Değer": free },
    { "Metrik": "Ücretli Servis", "Değer": paid },
    { "Metrik": "Garantili Servis", "Değer": warranty },
    { "Metrik": "Toplam Ücretli Tutar (TRY)", "Değer": totalRevenue },
    { "Metrik": "", "Değer": "" },
    { "Metrik": "En Yoğun İlçeler", "Değer": "" },
    ...topCities.map(([city, count]) => ({ "Metrik": city, "Değer": count })),
  ];

  const wb = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Özet");
  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, detailSheet, "Servisler");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const today = new Date();
  const fname = `tss-takip-rapor-${today.toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
    },
  });
}
