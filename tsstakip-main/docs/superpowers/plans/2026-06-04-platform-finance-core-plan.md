# Platform + Finance Core Implementation Plan

## Goal

Implement the first delivery slice of the approved design by establishing the platform foundation and the first finance-ready schema extensions.

## Planned Phases

### Phase 1: Platform Foundation

- add `organizations`
- add `organization_members`
- add `regions`
- add `audit_logs`
- link existing `services` records to an organization
- seed a default organization from existing data
- preserve backward compatibility with current `profiles.role`

### Phase 2: Application Access Layer

- extend Supabase TypeScript types
- add organization-aware auth helpers
- centralize organization membership resolution for server-side actions

### Phase 3: Finance Schema Foundation

- add catalog item and price version tables
- add regional multiplier table
- extend `services` with financial snapshot fields
- add negotiation and invoice tables
- add payout batch tables

### Phase 4: Finance Write Flows

- initialize service financial snapshots
- record negotiation history
- validate invoice upload against `approved_cost`
- generate payout batches with cut-off rules

### Phase 5: Hardening

- add SQL constraints and indexes
- add audit instrumentation to critical writes
- validate happy path and mismatch scenarios

## Immediate Execution Slice

This session starts with Phase 1 and the minimum Phase 2 work needed to support it:

1. add a new Supabase migration for organization and audit foundations
2. update TypeScript database types
3. update auth helpers to resolve active organization membership
4. run targeted validation

## Non-Goals For This Session

- complete the entire finance engine
- implement UI for the new platform entities
- refactor every existing action to organization-aware logic in one pass

## Expected Outcome

At the end of this session, the project should have a tenant-aware base layer and application helpers ready for the next finance migrations.
