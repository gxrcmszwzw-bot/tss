import type { ServiceStatus } from "@/lib/supabase/types";

export type PublicTrackingSnapshot = {
  token: string;
  serviceNumber: string;
  customerName: string;
  address: string;
  district: string | null;
  status: ServiceStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  serviceLatitude: number | null;
  serviceLongitude: number | null;
  technicianLatitude: number | null;
  technicianLongitude: number | null;
  technicianLastSeenAt: string | null;
  technicianEtaMinutes: number | null;
  technicianArrivedAt: string | null;
};

export function resolveTrackingProgress(status: ServiceStatus) {
  switch (status) {
    case "pending":
      return 10;
    case "awaiting_approval":
      return 20;
    case "approved":
      return 35;
    case "in_progress":
      return 70;
    case "completed":
      return 100;
    case "rejected":
    case "canceled":
      return 100;
    default:
      return 0;
  }
}

export function resolveTrackingStage(status: ServiceStatus) {
  switch (status) {
    case "pending":
      return "Kayit alindi";
    case "awaiting_approval":
      return "Onay bekleniyor";
    case "approved":
      return "Ekip yonlendirildi";
    case "in_progress":
      return "Saha ekibi yolda / iste";
    case "completed":
      return "Servis tamamlandi";
    case "rejected":
      return "Servis reddedildi";
    case "canceled":
      return "Servis iptal edildi";
    default:
      return "Hazirlaniyor";
  }
}

export function buildPublicTrackingSnapshot(service: {
  public_tracking_token: string;
  service_number: string;
  customer_name: string;
  address: string;
  district: string | null;
  status: ServiceStatus;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  service_latitude: number | null;
  service_longitude: number | null;
  technician_last_latitude: number | null;
  technician_last_longitude: number | null;
  technician_last_seen_at: string | null;
  technician_eta_minutes: number | null;
  technician_arrived_at: string | null;
}): PublicTrackingSnapshot {
  return {
    token: service.public_tracking_token,
    serviceNumber: service.service_number,
    customerName: service.customer_name,
    address: service.address,
    district: service.district,
    status: service.status,
    scheduledAt: service.scheduled_at,
    startedAt: service.started_at,
    completedAt: service.completed_at,
    serviceLatitude: service.service_latitude,
    serviceLongitude: service.service_longitude,
    technicianLatitude: service.technician_last_latitude,
    technicianLongitude: service.technician_last_longitude,
    technicianLastSeenAt: service.technician_last_seen_at,
    technicianEtaMinutes: service.technician_eta_minutes,
    technicianArrivedAt: service.technician_arrived_at,
  };
}
