# Platform + Finance Core Design

## Purpose

This spec defines the first implementation slice for TSS Takip as an enterprise field operations SaaS platform. The goal of this slice is not to complete the full product vision. The goal is to establish the operating backbone that later modules can safely build on:

- tenant-aware data ownership
- auditable financial decisions
- controlled negotiation and invoice workflows
- deterministic weekly payout batching

This slice covers only the `Core Platform` and `Finance Engine` domains.

## Scope

In scope:

- organization and membership model
- region-aware pricing structure
- audit logging for critical changes
- service financial snapshot fields
- negotiation history
- invoice validation workflow
- weekly payout batch and cut-off logic
- server-side write boundaries
- database-level correctness constraints

Out of scope for this slice:

- offline mobile sync
- geofencing and live tracking
- AI vision and NLP execution
- WhatsApp/SMS delivery
- advanced analytics dashboards
- full subcontractor legal workflow beyond core contractor identity and document tracking structure

## Recommended Architecture

The recommended approach is a modular monolith inside the existing `Next.js + Supabase` application.

Why this approach:

- it fits the current repository and delivery speed goals
- it avoids premature service sprawl
- it still allows strict domain boundaries if tables, actions, and policies are designed intentionally

The implementation is organized into four boundaries:

### 1. Core Platform

Responsible for:

- organizations
- organization membership
- branch or region ownership
- shared authorization rules
- audit logs
- common domain events

### 2. Finance Engine

Responsible for:

- catalog items
- price versioning
- regional multipliers
- service financial snapshots
- negotiation history
- invoices
- payout batches

### 3. Operations

Responsible for:

- service records
- work assignment
- subcontractor association
- operational lifecycle states

In this slice, Operations is only extended enough to support finance. It remains a separate bounded context.

### 4. Integration Layer

Responsible for:

- outbound events
- future AI jobs
- future notification triggers

In this slice, only event contracts and hook points are prepared. Full integrations are not implemented.

## Data Model

### Organizational Structure

#### `organizations`

Tenant root entity.

Suggested fields:

- `id`
- `name`
- `code`
- `is_active`
- `created_at`
- `updated_at`

#### `organization_members`

Maps users to organizations and roles.

Suggested fields:

- `id`
- `organization_id`
- `user_id`
- `role`
- `is_active`
- `created_at`
- `updated_at`

This table replaces the assumption that a user has one global role with global authority. Existing `profiles.role` may remain temporarily for backward compatibility, but the target authority model is organization-scoped membership.

#### `regions`

Operational and pricing boundary within an organization.

Suggested fields:

- `id`
- `organization_id`
- `name`
- `code`
- `is_active`
- `created_at`
- `updated_at`

### Audit Layer

#### `audit_logs`

Stores immutable change history for critical actions.

Suggested fields:

- `id`
- `organization_id`
- `actor_user_id`
- `entity_type`
- `entity_id`
- `action`
- `old_data`
- `new_data`
- `reason_code`
- `source`
- `request_id`
- `created_at`

Rules:

- insert-only
- no hard delete
- generated for all critical finance and access actions

### Finance Catalog

#### `catalog_items`

Defines standardized billable work items.

Suggested fields:

- `id`
- `organization_id`
- `name`
- `code`
- `unit`
- `is_active`
- `created_at`
- `updated_at`

#### `catalog_price_versions`

Stores historical standard prices so older services keep their original valuation.

Suggested fields:

- `id`
- `catalog_item_id`
- `base_price`
- `currency`
- `effective_from`
- `effective_to`
- `created_by`
- `created_at`

#### `regional_price_multipliers`

Stores region-based pricing factors.

Suggested fields:

- `id`
- `organization_id`
- `region_id`
- `catalog_item_id`
- `multiplier`
- `effective_from`
- `effective_to`
- `created_at`

### Contractor Structure

#### `contractors`

Represents the financially accountable main contractor.

Suggested fields:

- `id`
- `organization_id`
- `name`
- `contact_name`
- `phone`
- `is_active`
- `created_at`
- `updated_at`

#### `contractor_documents`

Tracks document validity and readiness.

Suggested fields:

- `id`
- `contractor_id`
- `document_type`
- `status`
- `expires_at`
- `storage_path`
- `reviewed_by`
- `reviewed_at`
- `created_at`

### Service Extensions

The existing `services` table is expanded rather than replaced.

New fields to add:

- `organization_id`
- `region_id`
- `catalog_item_id`
- `contractor_id`
- `standard_price_snapshot`
- `regional_multiplier_snapshot`
- `expected_revenue`
- `negotiated_cost`
- `approved_cost`
- `margin_estimate`
- `finance_status`
- `finance_closed_at`

Key rule:

Financial snapshot fields are written when the service becomes financially initialized. Historical prices must not be recalculated by later catalog changes.

### Negotiation History

#### `service_negotiations`

Stores every negotiation step.

Suggested fields:

- `id`
- `organization_id`
- `service_id`
- `contractor_id`
- `initiated_by`
- `offered_cost`
- `counterparty_note`
- `internal_note`
- `status`
- `created_at`

The latest accepted negotiation determines `approved_cost`, but history remains intact.

### Invoice Workflow

#### `service_invoices`

Stores uploaded invoice records and validation results.

Suggested fields:

- `id`
- `organization_id`
- `service_id`
- `contractor_id`
- `invoice_number`
- `invoice_date`
- `invoice_amount`
- `currency`
- `storage_path`
- `match_status`
- `match_reason`
- `uploaded_by`
- `uploaded_at`
- `reviewed_by`
- `reviewed_at`

Recommended `match_status` values:

- `matched`
- `needs_review`
- `blocked`

### Payout Processing

#### `payout_batches`

Represents the weekly payment list.

Suggested fields:

- `id`
- `organization_id`
- `batch_date`
- `cutoff_at`
- `status`
- `created_by`
- `created_at`
- `finalized_at`

#### `payout_batch_items`

Stores batch inclusion or exclusion decisions per invoice.

Suggested fields:

- `id`
- `batch_id`
- `invoice_id`
- `service_id`
- `inclusion_status`
- `reason_code`
- `override_note`
- `created_at`

This preserves why a record entered or missed a payment batch.

### Calendar Support

#### `business_calendar`

Supports holiday and business-rule exceptions.

Suggested fields:

- `id`
- `organization_id`
- `date`
- `rule_type`
- `note`

This avoids hardcoding all weekly schedule assumptions forever.

## Workflow Design

### 1. Service Financial Initialization

When a service is created or assigned a billable work item:

- the system resolves the active `catalog_price_versions` record
- the system resolves the active `regional_price_multipliers` record
- the system writes snapshot values onto `services`
- the system calculates initial `expected_revenue`

This makes every service financially self-contained.

### 2. Negotiation Flow

Negotiation is eventful, not overwrite-only.

Flow:

- authorized user starts negotiation
- each offer or counter-offer creates a `service_negotiations` record
- the accepted negotiation updates `services.approved_cost`
- audit log captures the accepted decision

This allows later review of who approved what and when.

### 3. Operational Completion vs Financial Readiness

A service being operationally complete must not automatically imply payment readiness.

Recommended separation:

- operational completion remains in the operational status flow
- finance uses a dedicated `finance_status`

Suggested `finance_status` stages:

- `not_initialized`
- `awaiting_negotiation`
- `awaiting_invoice`
- `invoice_under_review`
- `approved_for_payout`
- `excluded_from_batch`
- `paid`

This prevents one status field from carrying unrelated responsibilities.

### 4. Invoice Validation

When an invoice is uploaded:

- the invoice record is created
- the system compares `invoice_amount` against `approved_cost`
- exact matches become `matched`
- small threshold differences become `needs_review`
- material differences become `blocked`

Threshold policy must be explicit in implementation. Default recommendation: make the threshold organization-configurable instead of hardcoded.

### 5. Weekly Cut-off

The core business rule is:

- invoices not in an eligible state by Wednesday 12:00 local time are excluded from that week’s Friday payout batch

Implementation rules:

- evaluate using the tenant’s operating timezone
- record the cut-off timestamp on the batch
- create batch item records for both included and excluded invoices
- keep exclusion reason codes
- allow explicit override only for privileged users
- require override reason and audit log entry

### 6. Weekly Payout Batch

A payout batch is generated from eligible invoices after cut-off evaluation.

Batch generation must be:

- idempotent
- reproducible from source data
- protected from duplicate finalization

Suggested batch statuses:

- `draft`
- `finalized`
- `paid`
- `voided`

## Security Model

### Tenant Isolation

Every critical business table in this slice carries `organization_id`.

RLS policy direction:

- users may only read rows for organizations they belong to
- write permissions depend on organization membership role
- contractor, service, invoice, and batch visibility all inherit tenant scope

### Write Boundaries

Critical finance fields must only be mutated by controlled server-side logic:

- `approved_cost`
- `finance_status`
- `match_status`
- `payout_batch_id` or equivalent batch linkage
- override decisions

The client must not directly update these columns.

### Manual Overrides

Manual overrides are allowed only when:

- the actor has elevated organizational authority
- a reason is provided
- the action is audit logged

## Error Handling

The design goal is to eliminate silent corruption.

Rules:

- file upload and DB insert failures must leave a traceable error state
- payout generation jobs must be idempotent
- historical financial snapshots must remain stable even if catalog pricing changes later
- downstream events should be emitted after transactional success
- failed outbound event delivery should move to a retryable queue mechanism in a later phase

Recommended operational error categories:

- `validation_error`
- `sync_error`
- `policy_error`
- `batch_conflict`

## Testing Strategy

### SQL-Level Tests

Validate:

- constraints
- RLS policies
- audit creation
- cutoff eligibility logic
- duplicate batch prevention

### Server-Side Application Tests

Validate:

- service financial initialization
- negotiation acceptance flow
- invoice upload and matching
- payout batch generation
- override flows

### End-to-End Integration Tests

Validate:

- service creation to approved payout path
- mismatch invoice review path
- cutoff exclusion path

### UI Smoke Tests

Validate:

- admin finance forms
- negotiation screens
- invoice review screens
- payout batch review screen

## Delivery Sequence

Recommended implementation order:

1. organization and membership model
2. audit log foundation
3. catalog pricing and regional multiplier model
4. service financial snapshot migration
5. negotiation workflow
6. invoice workflow
7. payout batch and cutoff job
8. test coverage and hardening

## Done Definition

This slice is complete when all of the following are true:

- tenant-aware ownership is enforced
- critical finance changes produce audit logs
- services store stable financial snapshots
- negotiation history is preserved
- invoice validation status works end to end
- weekly payout batches can be generated deterministically
- cut-off exclusions are visible with reasons
- baseline tests for SQL and server-side flows pass

## Explicit Non-Goals

This slice does not attempt to solve the full master prompt in one step.

It intentionally does not implement:

- AI scoring
- offline sync engine
- public live map tracking
- full legal acceptance workflow
- advanced profitability dashboards

Those features should build on top of this slice after the financial and tenant backbone is stable.
