import { describe, expect, it } from "vitest";

import { buildContractDetailSummary, summarizeContractLifecycle } from "./contracts";

describe("summarizeContractLifecycle", () => {
  it("marks installation_in_progress when open installation tasks exist", () => {
    const result = summarizeContractLifecycle({
      contract: { status: "approved", lifecycle_stage: "approved", end_date: null },
      projects: [{ status: "in_progress" }],
      installationTasks: [{ status: "in_progress" }],
      services: [],
    });

    expect(result.lifecycleStage).toBe("installation_in_progress");
  });

  it("marks support_phase when installation is done and open service exists", () => {
    const result = summarizeContractLifecycle({
      contract: { status: "approved", lifecycle_stage: "approved", end_date: null },
      projects: [{ status: "completed" }],
      installationTasks: [{ status: "completed" }],
      services: [{ status: "pending" }],
    });

    expect(result.lifecycleStage).toBe("support_phase");
  });

  it("marks renewal_due when contract is within 30 days of end date", () => {
    const result = summarizeContractLifecycle({
      contract: {
        status: "approved",
        lifecycle_stage: "live",
        end_date: "2026-07-10",
      },
      projects: [],
      installationTasks: [],
      services: [],
      now: new Date("2026-06-18T09:00:00.000Z"),
    });

    expect(result.lifecycleStage).toBe("renewal_due");
  });
});

describe("buildContractDetailSummary", () => {
  it("builds contract rollup counters", () => {
    const result = buildContractDetailSummary({
      contract: { status: "approved", lifecycle_stage: "approved", end_date: null },
      projects: [{ id: "p1", contract_id: "c1", name: "P1", status: "planned", planned_start_at: null, planned_end_at: null, actual_start_at: null, actual_end_at: null, project_manager_id: null, notes: null, created_at: "", updated_at: "" }],
      phases: [],
      contractSites: [{ id: "cs1", contract_id: "c1", site_id: "s1", role: "installation_site", is_primary: true, created_at: "" }],
      contractProducts: [{ id: "cp1", contract_id: "c1", catalog_item_id: null, product_name_snapshot: "PTS", quantity: 1, unit: "adet", requires_installation: true, is_iot_related: false, is_service_covered: true, notes: null, created_at: "" }],
      installationTasks: [
        { id: "t1", project_phase_id: "ph1", contract_id: "c1", site_id: "s1", title: "Kurulum", task_type: "field_installation", status: "completed", assigned_team: null, assigned_member_id: null, assigned_subcontractor_id: null, planned_at: null, completed_at: null, depends_on_task_id: null, created_at: "", updated_at: "" },
        { id: "t2", project_phase_id: "ph1", contract_id: "c1", site_id: "s1", title: "Egitim", task_type: "training", status: "pending", assigned_team: null, assigned_member_id: null, assigned_subcontractor_id: null, planned_at: null, completed_at: null, depends_on_task_id: null, created_at: "", updated_at: "" },
      ],
      services: [
        { id: "srv1", service_number: "S1", organization_id: "o1", customer_name: "A", customer_phone: "1", address: "x", district: null, site_id: "site", customer_site_id: null, project_name: null, product_group_id: null, service_type_id: null, member_id: null, priority: "normal", scheduled_at: null, description: null, status: "completed", team_type: "technical_team", subcontractor_id: null, subcontractor_contact: null, subcontractor_phone: null, contract_id: null, project_id: null, contract_site_id: null, region_id: null, catalog_item_id: null, catalog_item_ids: [], service_latitude: null, service_longitude: null, geofence_radius_meters: 150, public_tracking_token: "", public_tracking_enabled: false, technician_last_latitude: null, technician_last_longitude: null, technician_last_seen_at: null, technician_eta_minutes: null, technician_arrived_at: null, fee_type: "free", amount: null, currency: "TRY", payment_status: null, standard_price_snapshot: null, regional_multiplier_snapshot: null, expected_revenue: null, negotiated_cost: null, approved_cost: null, margin_estimate: null, finance_status: "not_initialized", finance_closed_at: null, warranty_code: null, warranty_expires_at: null, started_at: null, completed_at: null, customer_approval_sent_at: null, customer_approved_at: null, customer_rejected_at: null, created_by: null, created_at: "", updated_at: "" },
      ],
    });

    expect(result.linkedSiteCount).toBe(1);
    expect(result.contractProductCount).toBe(1);
    expect(result.completedInstallationTaskCount).toBe(1);
    expect(result.openInstallationTaskCount).toBe(1);
    expect(result.completedServiceCount).toBe(1);
    expect(result.completionRate).toBe(50);
  });
});
