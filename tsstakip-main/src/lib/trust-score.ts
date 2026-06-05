import type {
  AiAlert,
  Service,
  ServiceInvoice,
  ServicePhotoInspection,
  Subcontractor,
} from "@/lib/data";
import type { Json, SubcontractorTrustGrade } from "@/lib/supabase/types";

type TrustScoreSignals = {
  completionRate: number;
  onTimeRate: number;
  invoiceMatchRate: number;
  budgetAdherenceRate: number;
  qualityScore: number;
  alertPenalty: number;
};

type TrustScoreResult = {
  subcontractorId: string;
  score: number;
  grade: SubcontractorTrustGrade;
  serviceCount: number;
  completedCount: number;
  onTimeRate: number;
  invoiceMatchRate: number;
  budgetAdherenceRate: number;
  qualityScore: number;
  alertPenalty: number;
  signals: Json;
};

export type RefreshTrustScoresInput = {
  organizationId: string;
  subcontractors: Subcontractor[];
  services: Service[];
  invoices: ServiceInvoice[];
  photoInspections: ServicePhotoInspection[];
  aiAlerts: AiAlert[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function toPercent(value: number) {
  return Number((clamp(value, 0, 1) * 100).toFixed(2));
}

function gradeFromScore(score: number): SubcontractorTrustGrade {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}

export function buildSubcontractorTrustScore(input: {
  subcontractor: Subcontractor;
  services: Service[];
  invoices: ServiceInvoice[];
  photoInspections: ServicePhotoInspection[];
  aiAlerts: AiAlert[];
}): TrustScoreResult {
  const services = input.services.filter(
    (service) =>
      service.team_type === "subcontractor" &&
      service.subcontractor_id === input.subcontractor.id,
  );
  const serviceIds = new Set(services.map((service) => service.id));
  const invoices = input.invoices.filter((invoice) => serviceIds.has(invoice.service_id));
  const photoInspections = input.photoInspections.filter((inspection) =>
    serviceIds.has(inspection.service_id),
  );
  const aiAlerts = input.aiAlerts.filter(
    (alert) => alert.service_id && serviceIds.has(alert.service_id),
  );

  const serviceCount = services.length;
  const completedServices = services.filter((service) => service.status === "completed");
  const completedCount = completedServices.length;
  const completedOrApprovedCount = services.filter((service) =>
    ["completed", "approved"].includes(service.status),
  ).length;
  const completionRate = ratio(completedOrApprovedCount, Math.max(serviceCount, 1));

  const onTimeCount = completedServices.filter((service) => {
    if (!service.scheduled_at || !service.completed_at) return false;
    return new Date(service.completed_at).getTime() <= new Date(service.scheduled_at).getTime();
  }).length;
  const onTimeRate = ratio(onTimeCount, Math.max(completedCount, 1));

  const matchedInvoices = invoices.filter((invoice) => invoice.match_status === "matched").length;
  const invoiceMatchRate = ratio(matchedInvoices, Math.max(invoices.length, 1));

  const budgetAlignedCount = services.filter((service) => {
    if (service.approved_cost === null || service.expected_revenue === null) return false;
    if (service.expected_revenue <= 0) return false;
    return service.approved_cost <= service.expected_revenue;
  }).length;
  const budgetAdherenceRate = ratio(budgetAlignedCount, Math.max(serviceCount, 1));

  const completedInspections = photoInspections.filter((inspection) =>
    ["approved", "needs_correction", "manual_review"].includes(inspection.status),
  );
  const averageQuality =
    completedInspections.length > 0
      ? completedInspections.reduce((sum, inspection) => sum + (inspection.score ?? 3), 0) /
        completedInspections.length
      : 3;
  const qualityScore = Number(((averageQuality / 5) * 100).toFixed(2));

  const unresolvedAlerts = aiAlerts.filter((alert) => !alert.is_resolved);
  const highRiskAlerts = unresolvedAlerts.filter((alert) => alert.risk_level === "high").length;
  const mediumRiskAlerts = unresolvedAlerts.filter((alert) => alert.risk_level === "medium").length;
  const alertPenalty = Number(
    Math.min(30, highRiskAlerts * 8 + mediumRiskAlerts * 4 + unresolvedAlerts.length * 1.5).toFixed(2),
  );

  const weightedScore =
    completionRate * 25 +
    onTimeRate * 20 +
    invoiceMatchRate * 20 +
    budgetAdherenceRate * 15 +
    (qualityScore / 100) * 20;
  const score = Number(clamp(weightedScore - alertPenalty, 0, 100).toFixed(2));

  const signals: TrustScoreSignals = {
    completionRate: toPercent(completionRate),
    onTimeRate: toPercent(onTimeRate),
    invoiceMatchRate: toPercent(invoiceMatchRate),
    budgetAdherenceRate: toPercent(budgetAdherenceRate),
    qualityScore,
    alertPenalty,
  };

  return {
    subcontractorId: input.subcontractor.id,
    score,
    grade: gradeFromScore(score),
    serviceCount,
    completedCount,
    onTimeRate: signals.onTimeRate,
    invoiceMatchRate: signals.invoiceMatchRate,
    budgetAdherenceRate: signals.budgetAdherenceRate,
    qualityScore: signals.qualityScore,
    alertPenalty: signals.alertPenalty,
    signals,
  };
}

export function buildTrustScoreBatch(input: RefreshTrustScoresInput) {
  return input.subcontractors.map((subcontractor) => {
    const score = buildSubcontractorTrustScore({
      subcontractor,
      services: input.services,
      invoices: input.invoices,
      photoInspections: input.photoInspections,
      aiAlerts: input.aiAlerts,
    });

    return {
      organization_id: input.organizationId,
      subcontractor_id: score.subcontractorId,
      score: score.score,
      grade: score.grade,
      service_count: score.serviceCount,
      completed_count: score.completedCount,
      on_time_rate: score.onTimeRate,
      invoice_match_rate: score.invoiceMatchRate,
      budget_adherence_rate: score.budgetAdherenceRate,
      quality_score: score.qualityScore,
      alert_penalty: score.alertPenalty,
      signals: score.signals,
      computed_at: new Date().toISOString(),
    };
  });
}
