import type {
  AiJobStatus,
  AiRiskLevel,
  FeeType,
  FinanceStatus,
  InvoiceMatchStatus,
  NegotiationStatus,
  NotificationChannel,
  NotificationDeliveryStatus,
  PaymentStatus,
  PhotoInspectionStatus,
  PayoutBatchStatus,
  PayoutItemStatus,
  ServicePriority,
  ServiceStatus,
  TeamType,
} from "@/lib/supabase/types";

export const statusLabels: Record<ServiceStatus, string> = {
  pending: "Bekliyor",
  in_progress: "Devam Ediyor",
  awaiting_approval: "Onay Bekliyor",
  approved: "Onaylandı",
  completed: "Tamamlandı",
  canceled: "İptal",
  rejected: "Reddedildi",
};

export const priorityLabels: Record<ServicePriority, string> = {
  urgent: "Acil",
  high: "Yüksek",
  normal: "Normal",
  low: "Düşük",
};

export const feeLabels: Record<FeeType, string> = {
  free: "Ücretsiz",
  paid: "Ücretli",
  warranty: "Garanti",
};

export const teamLabels: Record<TeamType, string> = {
  technical_team: "Teknik Ekip",
  subcontractor: "Taşeron",
};

export const paymentLabels: Record<PaymentStatus, string> = {
  pending: "Bekliyor",
  paid: "Ödendi",
  partial: "Kısmi",
};

export const financeStatusLabels: Record<FinanceStatus, string> = {
  not_initialized: "Hazırlanmadı",
  awaiting_negotiation: "Pazarlık Bekliyor",
  awaiting_invoice: "Fatura Bekliyor",
  invoice_under_review: "Fatura İncelemede",
  approved_for_payout: "Ödeme İçin Hazır",
  excluded_from_batch: "Batch Dışı",
  paid: "Ödendi",
};

export const negotiationStatusLabels: Record<NegotiationStatus, string> = {
  proposed: "Teklif Verildi",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
  canceled: "İptal Edildi",
};

export const invoiceMatchLabels: Record<InvoiceMatchStatus, string> = {
  matched: "Eşleşti",
  needs_review: "İnceleme Gerekli",
  blocked: "Bloklu",
};

export const payoutBatchLabels: Record<PayoutBatchStatus, string> = {
  draft: "Taslak",
  finalized: "Kesinleşti",
  paid: "Ödendi",
  voided: "İptal Edildi",
};

export const payoutItemLabels: Record<PayoutItemStatus, string> = {
  included: "Dahil",
  excluded: "Hariç",
  overridden: "Override",
};

export const payoutReasonLabels: Record<string, string> = {
  eligible: "Uygun",
  invoice_needs_review: "Fatura inceleme bekliyor",
  invoice_blocked: "Fatura bloklu",
  uploaded_after_cutoff: "Cut-off sonrası yüklendi",
  manual_override: "Manuel override",
  finalized: "Kesinleştirildi",
};

export const aiRiskLabels: Record<AiRiskLevel, string> = {
  low: "Düşük Risk",
  medium: "Orta Risk",
  high: "Yüksek Risk",
};

export const aiJobStatusLabels: Record<AiJobStatus, string> = {
  pending: "Bekliyor",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  failed: "Hata",
};

export const photoInspectionStatusLabels: Record<PhotoInspectionStatus, string> = {
  pending: "Denetim Bekliyor",
  processing: "Denetleniyor",
  approved: "Onaylandı",
  needs_correction: "Düzeltme Gerekli",
  manual_review: "Manuel İnceleme",
  failed: "Hata",
};

export const subcontractorTrustGradeLabels: Record<"A" | "B" | "C" | "D", string> = {
  A: "A · Yüksek Güven",
  B: "B · Güvenilir",
  C: "C · İzlenmeli",
  D: "D · Riskli",
};

export const notificationChannelLabels: Record<NotificationChannel, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
};

export const notificationDeliveryStatusLabels: Record<NotificationDeliveryStatus, string> = {
  pending: "Bekliyor",
  processing: "İşleniyor",
  sent: "Gönderildi",
  failed: "Hata",
  canceled: "İptal",
};

export function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatCurrency(amount: number | null, currency: string) {
  if (amount === null) return "-";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(amount);
}
