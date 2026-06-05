export type UserRole = "admin" | "member";
export type OrganizationRole = "owner" | "admin" | "member";
export type ServicePriority = "urgent" | "high" | "normal" | "low";
export type ServiceStatus =
  | "pending"
  | "in_progress"
  | "awaiting_approval"
  | "approved"
  | "completed"
  | "canceled"
  | "rejected";
export type TeamType = "technical_team" | "subcontractor";
export type FeeType = "free" | "paid" | "warranty";
export type PaymentStatus = "pending" | "paid" | "partial";
export type PhotoType = "start" | "end" | "during";
export type FinanceStatus =
  | "not_initialized"
  | "awaiting_negotiation"
  | "awaiting_invoice"
  | "invoice_under_review"
  | "approved_for_payout"
  | "excluded_from_batch"
  | "paid";
export type NegotiationStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "canceled";
export type InvoiceMatchStatus = "matched" | "needs_review" | "blocked";
export type PayoutBatchStatus = "draft" | "finalized" | "paid" | "voided";
export type PayoutItemStatus = "included" | "excluded" | "overridden";
export type AiJobStatus = "pending" | "processing" | "completed" | "failed";
export type AiRiskLevel = "low" | "medium" | "high";
export type PhotoInspectionStatus =
  | "pending"
  | "processing"
  | "approved"
  | "needs_correction"
  | "manual_review"
  | "failed";
export type SubcontractorTrustGrade = "A" | "B" | "C" | "D";
export type NotificationChannel = "sms" | "whatsapp";
export type NotificationDeliveryStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "canceled";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          code: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: OrganizationRole;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: OrganizationRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["organization_members"]["Insert"]
        >;
        Relationships: [];
      };
      regions: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          code: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          code: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["regions"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          actor_user_id: string | null;
          entity_type: string;
          entity_id: string | null;
          action: string;
          old_data: Json | null;
          new_data: Json | null;
          reason_code: string | null;
          source: string;
          request_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          actor_user_id?: string | null;
          entity_type: string;
          entity_id?: string | null;
          action: string;
          old_data?: Json | null;
          new_data?: Json | null;
          reason_code?: string | null;
          source?: string;
          request_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      catalog_items: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          code: string;
          unit: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          code: string;
          unit?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["catalog_items"]["Insert"]>;
        Relationships: [];
      };
      catalog_price_versions: {
        Row: {
          id: string;
          catalog_item_id: string;
          base_price: number;
          currency: string;
          effective_from: string;
          effective_to: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          catalog_item_id: string;
          base_price: number;
          currency?: string;
          effective_from: string;
          effective_to?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["catalog_price_versions"]["Insert"]
        >;
        Relationships: [];
      };
      regional_price_multipliers: {
        Row: {
          id: string;
          organization_id: string;
          region_id: string;
          catalog_item_id: string;
          multiplier: number;
          effective_from: string;
          effective_to: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          region_id: string;
          catalog_item_id: string;
          multiplier?: number;
          effective_from: string;
          effective_to?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["regional_price_multipliers"]["Insert"]
        >;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          role: UserRole;
          is_active: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          role?: UserRole;
          is_active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      subcontractors: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          contact_name: string | null;
          phone: string | null;
          city_code: string | null;
          city_name: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          contact_name?: string | null;
          phone?: string | null;
          city_code?: string | null;
          city_name?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subcontractors"]["Insert"]>;
        Relationships: [];
      };
      customer_sites: {
        Row: {
          id: string;
          organization_id: string;
          site_code: string;
          site_name: string | null;
          customer_name: string;
          customer_phone: string | null;
          address: string | null;
          city_code: string | null;
          city_name: string | null;
          district_name: string | null;
          project_name: string | null;
          airtable_record_id: string | null;
          source: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          site_code: string;
          site_name?: string | null;
          customer_name: string;
          customer_phone?: string | null;
          address?: string | null;
          city_code?: string | null;
          city_name?: string | null;
          district_name?: string | null;
          project_name?: string | null;
          airtable_record_id?: string | null;
          source?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_sites"]["Insert"]>;
        Relationships: [];
      };
      product_groups: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_groups"]["Insert"]>;
        Relationships: [];
      };
      service_types: {
        Row: {
          id: string;
          name: string;
          product_group_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          product_group_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["service_types"]["Insert"]>;
        Relationships: [];
      };
      priority_settings: {
        Row: {
          priority: ServicePriority;
          label: string;
          is_active: boolean;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          priority: ServicePriority;
          label: string;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["priority_settings"]["Insert"]
        >;
        Relationships: [];
      };
      photo_rules: {
        Row: {
          id: string;
          require_start_photo: boolean;
          require_end_photo: boolean;
          camera_only: boolean;
          gallery_upload_enabled: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          require_start_photo?: boolean;
          require_end_photo?: boolean;
          camera_only?: boolean;
          gallery_upload_enabled?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["photo_rules"]["Insert"]>;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          service_number: string;
          organization_id: string;
          customer_name: string;
          customer_phone: string;
          address: string;
          district: string | null;
          site_id: string;
          customer_site_id: string | null;
          project_name: string | null;
          product_group_id: string | null;
          service_type_id: string | null;
          member_id: string | null;
          priority: ServicePriority;
          scheduled_at: string | null;
          description: string | null;
          status: ServiceStatus;
          team_type: TeamType;
          subcontractor_id: string | null;
          subcontractor_contact: string | null;
          subcontractor_phone: string | null;
          region_id: string | null;
          catalog_item_id: string | null;
          service_latitude: number | null;
          service_longitude: number | null;
          geofence_radius_meters: number;
          public_tracking_token: string;
          public_tracking_enabled: boolean;
          technician_last_latitude: number | null;
          technician_last_longitude: number | null;
          technician_last_seen_at: string | null;
          technician_eta_minutes: number | null;
          technician_arrived_at: string | null;
          fee_type: FeeType;
          amount: number | null;
          currency: string;
          payment_status: PaymentStatus | null;
          standard_price_snapshot: number | null;
          regional_multiplier_snapshot: number | null;
          expected_revenue: number | null;
          negotiated_cost: number | null;
          approved_cost: number | null;
          margin_estimate: number | null;
          finance_status: FinanceStatus;
          finance_closed_at: string | null;
          warranty_code: string | null;
          warranty_expires_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          customer_approval_sent_at: string | null;
          customer_approved_at: string | null;
          customer_rejected_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service_number?: string;
          organization_id: string;
          customer_name: string;
          customer_phone: string;
          address: string;
          district?: string | null;
          site_id: string;
          customer_site_id?: string | null;
          project_name?: string | null;
          product_group_id?: string | null;
          service_type_id?: string | null;
          member_id?: string | null;
          priority?: ServicePriority;
          scheduled_at?: string | null;
          description?: string | null;
          status?: ServiceStatus;
          team_type?: TeamType;
          subcontractor_id?: string | null;
          subcontractor_contact?: string | null;
          subcontractor_phone?: string | null;
          region_id?: string | null;
          catalog_item_id?: string | null;
          service_latitude?: number | null;
          service_longitude?: number | null;
          geofence_radius_meters?: number;
          public_tracking_token?: string;
          public_tracking_enabled?: boolean;
          technician_last_latitude?: number | null;
          technician_last_longitude?: number | null;
          technician_last_seen_at?: string | null;
          technician_eta_minutes?: number | null;
          technician_arrived_at?: string | null;
          fee_type?: FeeType;
          amount?: number | null;
          currency?: string;
          payment_status?: PaymentStatus | null;
          standard_price_snapshot?: number | null;
          regional_multiplier_snapshot?: number | null;
          expected_revenue?: number | null;
          negotiated_cost?: number | null;
          approved_cost?: number | null;
          margin_estimate?: number | null;
          finance_status?: FinanceStatus;
          finance_closed_at?: string | null;
          warranty_code?: string | null;
          warranty_expires_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          customer_approval_sent_at?: string | null;
          customer_approved_at?: string | null;
          customer_rejected_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["services"]["Insert"]>;
        Relationships: [];
      };
      service_photos: {
        Row: {
          id: string;
          service_id: string;
          photo_type: PhotoType;
          storage_path: string;
          uploaded_by: string | null;
          taken_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          photo_type: PhotoType;
          storage_path: string;
          uploaded_by?: string | null;
          taken_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["service_photos"]["Insert"]>;
        Relationships: [];
      };
      service_photo_inspections: {
        Row: {
          id: string;
          organization_id: string;
          service_id: string;
          photo_id: string;
          photo_type: PhotoType;
          rubric_code: string;
          requested_by: string | null;
          score: number | null;
          summary: string | null;
          findings: Json;
          correction_request: string | null;
          status: PhotoInspectionStatus;
          processing_error: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          service_id: string;
          photo_id: string;
          photo_type: PhotoType;
          rubric_code?: string;
          requested_by?: string | null;
          score?: number | null;
          summary?: string | null;
          findings?: Json;
          correction_request?: string | null;
          status?: PhotoInspectionStatus;
          processing_error?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["service_photo_inspections"]["Insert"]
        >;
        Relationships: [];
      };
      service_negotiations: {
        Row: {
          id: string;
          organization_id: string;
          service_id: string;
          subcontractor_id: string | null;
          initiated_by: string | null;
          offered_cost: number;
          counterparty_note: string | null;
          internal_note: string | null;
          status: NegotiationStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          service_id: string;
          subcontractor_id?: string | null;
          initiated_by?: string | null;
          offered_cost: number;
          counterparty_note?: string | null;
          internal_note?: string | null;
          status?: NegotiationStatus;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["service_negotiations"]["Insert"]
        >;
        Relationships: [];
      };
      service_invoices: {
        Row: {
          id: string;
          organization_id: string;
          service_id: string;
          subcontractor_id: string | null;
          invoice_number: string | null;
          invoice_date: string | null;
          invoice_amount: number;
          currency: string;
          storage_path: string;
          match_status: InvoiceMatchStatus;
          match_reason: string | null;
          uploaded_by: string | null;
          uploaded_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          service_id: string;
          subcontractor_id?: string | null;
          invoice_number?: string | null;
          invoice_date?: string | null;
          invoice_amount: number;
          currency?: string;
          storage_path: string;
          match_status?: InvoiceMatchStatus;
          match_reason?: string | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["service_invoices"]["Insert"]
        >;
        Relationships: [];
      };
      payout_batches: {
        Row: {
          id: string;
          organization_id: string;
          batch_date: string;
          cutoff_at: string;
          status: PayoutBatchStatus;
          created_by: string | null;
          created_at: string;
          finalized_at: string | null;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          batch_date: string;
          cutoff_at: string;
          status?: PayoutBatchStatus;
          created_by?: string | null;
          created_at?: string;
          finalized_at?: string | null;
          paid_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payout_batches"]["Insert"]>;
        Relationships: [];
      };
      payout_batch_items: {
        Row: {
          id: string;
          batch_id: string;
          invoice_id: string | null;
          service_id: string;
          inclusion_status: PayoutItemStatus;
          reason_code: string | null;
          override_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          invoice_id?: string | null;
          service_id: string;
          inclusion_status?: PayoutItemStatus;
          reason_code?: string | null;
          override_note?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["payout_batch_items"]["Insert"]
        >;
        Relationships: [];
      };
      business_calendar: {
        Row: {
          id: string;
          organization_id: string;
          date: string;
          rule_type: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          date: string;
          rule_type: string;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["business_calendar"]["Insert"]>;
        Relationships: [];
      };
      service_voice_notes: {
        Row: {
          id: string;
          organization_id: string;
          service_id: string;
          uploaded_by: string | null;
          storage_path: string;
          transcript: string | null;
          summary: string | null;
          risk_level: AiRiskLevel;
          risk_flags: Json;
          processing_status: AiJobStatus;
          processing_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          service_id: string;
          uploaded_by?: string | null;
          storage_path: string;
          transcript?: string | null;
          summary?: string | null;
          risk_level?: AiRiskLevel;
          risk_flags?: Json;
          processing_status?: AiJobStatus;
          processing_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["service_voice_notes"]["Insert"]
        >;
        Relationships: [];
      };
      ai_alerts: {
        Row: {
          id: string;
          organization_id: string;
          service_id: string | null;
          voice_note_id: string | null;
          title: string;
          detail: string | null;
          risk_level: AiRiskLevel;
          is_resolved: boolean;
          resolved_note: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          service_id?: string | null;
          voice_note_id?: string | null;
          title: string;
          detail?: string | null;
          risk_level?: AiRiskLevel;
          is_resolved?: boolean;
          resolved_note?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_alerts"]["Insert"]>;
        Relationships: [];
      };
      subcontractor_trust_scores: {
        Row: {
          id: string;
          organization_id: string;
          subcontractor_id: string;
          score: number;
          grade: SubcontractorTrustGrade;
          service_count: number;
          completed_count: number;
          on_time_rate: number;
          invoice_match_rate: number;
          budget_adherence_rate: number;
          quality_score: number;
          alert_penalty: number;
          signals: Json;
          computed_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          subcontractor_id: string;
          score: number;
          grade: SubcontractorTrustGrade;
          service_count?: number;
          completed_count?: number;
          on_time_rate?: number;
          invoice_match_rate?: number;
          budget_adherence_rate?: number;
          quality_score?: number;
          alert_penalty?: number;
          signals?: Json;
          computed_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["subcontractor_trust_scores"]["Insert"]
        >;
        Relationships: [];
      };
      notification_templates: {
        Row: {
          id: string;
          organization_id: string;
          event_key: string;
          channel: NotificationChannel;
          template_name: string;
          body_template: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          event_key: string;
          channel: NotificationChannel;
          template_name: string;
          body_template: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["notification_templates"]["Insert"]
        >;
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          id: string;
          organization_id: string;
          service_id: string | null;
          subcontractor_id: string | null;
          channel: NotificationChannel;
          event_key: string;
          recipient: string;
          rendered_message: string;
          payload: Json;
          status: NotificationDeliveryStatus;
          provider_message_id: string | null;
          provider_response: Json | null;
          error_message: string | null;
          processing_attempts: number;
          last_attempt_at: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          service_id?: string | null;
          subcontractor_id?: string | null;
          channel: NotificationChannel;
          event_key: string;
          recipient: string;
          rendered_message: string;
          payload?: Json;
          status?: NotificationDeliveryStatus;
          provider_message_id?: string | null;
          provider_response?: Json | null;
          error_message?: string | null;
          processing_attempts?: number;
          last_attempt_at?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["notification_deliveries"]["Insert"]
        >;
        Relationships: [];
      };
      api_tokens: {
        Row: {
          id: string;
          name: string;
          token_hash: string;
          token_preview: string;
          token_value: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          token_hash: string;
          token_preview: string;
          token_value?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["api_tokens"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      service_priority: ServicePriority;
      service_status: ServiceStatus;
      team_type: TeamType;
      fee_type: FeeType;
      payment_status: PaymentStatus;
      photo_type: PhotoType;
    };
    CompositeTypes: Record<string, never>;
  };
};
