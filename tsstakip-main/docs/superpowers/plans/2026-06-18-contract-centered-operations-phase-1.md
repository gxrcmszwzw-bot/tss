# Contract-Centered Operations Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first production-ready contract-centered operations slice so TSS Takip can manage contracts, contract-linked projects, installation tasks, and contract-linked service records from a shared lookup model.

**Architecture:** Keep the existing Next.js + Supabase modular monolith and extend it with a new contract-centered lookup backbone. Phase 1 adds schema, types, server actions, and admin screens for contracts, sites, projects, and installation tasks while preserving the current service module as a separate operational flow linked back to contracts.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres, Supabase server actions, Tailwind CSS, Vitest for targeted domain tests, ESLint, `npm run build`

## Global Constraints

- Ortak cekirdek, ayri moduller
- Servis modulu korunur; kurulum ve satin alma ile ayni kayda zorlanmaz
- Her operasyonel kayit bir `contract_id` ile merkezi sozlesmeye baglanir
- Lookup modelinde `site` fiziksel lokasyonu temsil eder, `sozlesme` operasyon ve ticari merkezi temsil eder
- Bir site birden fazla sozlesmeye sahip olabilir
- Sozlesme karti 360 derece gorunum sunar
- Moduller kendi ekranlarina ve kendi is listelerine sahip olur
- Fazlama kademeli yapilir; once cekirdek ve kurulum, sonra stok ve IoT
- Kapsam disi: tam satin alma siparis motoru
- Kapsam disi: tam depo lot veya seri numarasi otomasyonu
- Kapsam disi: tam IoT okuma ve faturalandirma motoru
- Kapsam disi: yenileme otomasyonlari
- Kapsam disi: tum KPI dashboard'larinin ilk fazda tamamlanmasi

---

## File Map

### Database and types

- Create: `supabase/migrations/022_contract_center_foundation.sql`
  Contract, contract site, contract module, contract product, project, project phase, installation task, installation deliverable schema; `services` contract linkage columns; indexes and constraints.
- Modify: `src/lib/supabase/types.ts`
  Generated type surface for new tables and new `services` columns.
- Modify: `src/lib/data.ts`
  Export new row types for contracts, projects, phases, installation tasks, and contract products.

### Shared domain helpers

- Create: `src/lib/contracts.ts`
  Query helpers, lifecycle summarization, and lookups shared by actions and pages.
- Modify: `src/lib/labels.ts`
  Human-readable labels for contract status, lifecycle stage, project phase status, and installation task status.
- Create: `src/lib/contracts.test.ts`
  Vitest coverage for lifecycle summarization and phase progress rules.

### Actions and validation

- Modify: `src/app/actions.ts`
  Contract create/update flows, project create/update flows, installation task create/update flows, and service linkage updates.

### Admin pages and components

- Create: `src/app/admin/contracts/page.tsx`
  Contract listing and contract creation entry point.
- Create: `src/app/admin/contracts/[id]/page.tsx`
  Contract detail page with tabs and rollups.
- Create: `src/app/admin/sites/[id]/page.tsx`
  Site card showing all linked contracts and open work.
- Create: `src/app/admin/contracts/loading.tsx`
- Create: `src/app/admin/contracts/[id]/loading.tsx`
- Create: `src/app/admin/sites/[id]/loading.tsx`
- Create: `src/components/contracts/ContractCreateForm.tsx`
- Create: `src/components/contracts/ContractDetail.tsx`
- Create: `src/components/contracts/ContractTabs.tsx`
- Create: `src/components/contracts/InstallationBoard.tsx`
- Create: `src/components/contracts/SiteDetail.tsx`

### Existing page integrations

- Modify: `src/app/admin/page.tsx`
  Add contract-centered quick links and contract KPIs without removing current service summary.
- Modify: `src/app/admin/services/new/page.tsx`
  Load contracts and sites for service linkage.
- Modify: `src/components/services/ServiceForm.tsx`
  Add contract lookup, project lookup, and contract site lookup selectors.
- Modify: `src/components/services/ServiceDetail.tsx`
  Display linked contract/project/site summary.
- Modify: `src/app/admin/services/[id]/page.tsx`
  Load linked contract/project/site context.

### Testing and tooling

- Modify: `package.json`
  Add `test` script and Vitest dev dependency if missing.
- Create: `vitest.config.ts`
  Minimal Vitest config for `src/lib/**/*.test.ts`.

## Task 1: Add contract-center schema and service linkage

**Files:**
- Create: `supabase/migrations/022_contract_center_foundation.sql`
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/lib/data.ts`

**Interfaces:**
- Consumes: existing `customer_sites`, `services`, `catalog_items`, `profiles`, `organizations`
- Produces:
  - `contracts`
  - `contract_sites`
  - `contract_modules`
  - `contract_products`
  - `projects`
  - `project_phases`
  - `installation_tasks`
  - `installation_deliverables`
  - `services.contract_id: string | null`
  - `services.project_id: string | null`
  - `services.contract_site_id: string | null`

- [ ] **Step 1: Write the migration file**

```sql
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contract_no text not null,
  contract_type text not null,
  customer_name text not null,
  status text not null default 'draft',
  lifecycle_stage text not null default 'draft',
  primary_site_id uuid references public.customer_sites(id) on delete set null,
  technical_owner_id uuid references public.profiles(id) on delete set null,
  commercial_owner_id uuid references public.profiles(id) on delete set null,
  start_date date,
  end_date date,
  renewal_date date,
  summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, contract_no)
);
```

- [ ] **Step 2: Extend the migration with relation tables**

```sql
create table if not exists public.contract_sites (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  site_id uuid not null references public.customer_sites(id) on delete cascade,
  role text not null default 'installation_site',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (contract_id, site_id, role)
);

create table if not exists public.contract_modules (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  module_key text not null,
  is_enabled boolean not null default true,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  unique (contract_id, module_key)
);

create table if not exists public.contract_products (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  product_name_snapshot text not null,
  quantity numeric(12, 2) not null default 1,
  unit text,
  requires_installation boolean not null default true,
  is_iot_related boolean not null default false,
  is_service_covered boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 3: Add project and installation tables**

```sql
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  name text not null,
  status text not null default 'planned',
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  project_manager_id uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  phase_key text not null,
  status text not null default 'pending',
  planned_start_at timestamptz,
  planned_end_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, phase_key)
);
```

- [ ] **Step 4: Add task, deliverable, and service link columns**

```sql
create table if not exists public.installation_tasks (
  id uuid primary key default gen_random_uuid(),
  project_phase_id uuid not null references public.project_phases(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  site_id uuid references public.customer_sites(id) on delete set null,
  title text not null,
  task_type text not null,
  status text not null default 'pending',
  assigned_team text,
  assigned_member_id uuid references public.profiles(id) on delete set null,
  assigned_subcontractor_id uuid references public.subcontractors(id) on delete set null,
  planned_at timestamptz,
  completed_at timestamptz,
  depends_on_task_id uuid references public.installation_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.installation_deliverables (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  deliverable_type text not null,
  status text not null default 'pending',
  delivered_at timestamptz,
  delivered_by uuid references public.profiles(id) on delete set null,
  approval_required boolean not null default false,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.services
  add column if not exists contract_id uuid references public.contracts(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null,
  add column if not exists contract_site_id uuid references public.contract_sites(id) on delete set null;
```

- [ ] **Step 5: Add indexes, updated_at triggers, and run build-surface updates**

Run:

```bash
npm -C /Users/admin/Documents/Teknik/tsstakip-main run build
```

Expected:

```text
Compiled successfully
Finished TypeScript
```

- [ ] **Step 6: Commit**

```bash
git -C /Users/admin/Documents/Teknik add tsstakip-main/supabase/migrations/022_contract_center_foundation.sql tsstakip-main/src/lib/supabase/types.ts tsstakip-main/src/lib/data.ts
git -C /Users/admin/Documents/Teknik commit -m "feat: add contract center schema foundation"
```

## Task 2: Add contract domain helpers, labels, and tests

**Files:**
- Create: `src/lib/contracts.ts`
- Modify: `src/lib/labels.ts`
- Create: `src/lib/contracts.test.ts`
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Consumes: `Database["public"]["Tables"]["contracts"]["Row"]`, `projects`, `project_phases`, `installation_tasks`, `services`
- Produces:
  - `summarizeContractLifecycle(input): ContractLifecycleSummary`
  - `buildContractDetailSummary(input): ContractDetailSummary`
  - `contractStatusLabels`
  - `contractLifecycleLabels`
  - `installationTaskStatusLabels`

- [ ] **Step 1: Add Vitest tooling**

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 2: Add minimal Vitest config**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/lib/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 3: Write the failing tests for lifecycle summarization**

```ts
import { describe, expect, it } from "vitest";
import { summarizeContractLifecycle } from "@/lib/contracts";

describe("summarizeContractLifecycle", () => {
  it("marks installation_in_progress when open installation tasks exist", () => {
    const result = summarizeContractLifecycle({
      contract: { status: "approved", lifecycle_stage: "approved" },
      projects: [{ status: "in_progress" }],
      installationTasks: [{ status: "in_progress" }],
      services: [],
    });

    expect(result.lifecycleStage).toBe("installation_in_progress");
  });
});
```

- [ ] **Step 4: Implement helper functions and labels**

```ts
export function summarizeContractLifecycle(input: {
  contract: { status: string; lifecycle_stage: string };
  projects: Array<{ status: string }>;
  installationTasks: Array<{ status: string }>;
  services: Array<{ status: string }>;
}) {
  const hasOpenInstallTask = input.installationTasks.some((task) =>
    ["pending", "in_progress"].includes(task.status),
  );

  if (hasOpenInstallTask) {
    return { lifecycleStage: "installation_in_progress" as const };
  }

  return { lifecycleStage: input.contract.lifecycle_stage };
}
```

- [ ] **Step 5: Run targeted tests and full lint/build checks**

Run:

```bash
npm -C /Users/admin/Documents/Teknik/tsstakip-main test
npm -C /Users/admin/Documents/Teknik/tsstakip-main run lint
npm -C /Users/admin/Documents/Teknik/tsstakip-main run build
```

Expected:

```text
PASS src/lib/contracts.test.ts
```

- [ ] **Step 6: Commit**

```bash
git -C /Users/admin/Documents/Teknik add tsstakip-main/package.json tsstakip-main/vitest.config.ts tsstakip-main/src/lib/contracts.ts tsstakip-main/src/lib/contracts.test.ts tsstakip-main/src/lib/labels.ts
git -C /Users/admin/Documents/Teknik commit -m "feat: add contract domain helpers and tests"
```

## Task 3: Add contract actions and admin list/detail routes

**Files:**
- Modify: `src/app/actions.ts`
- Create: `src/app/admin/contracts/page.tsx`
- Create: `src/app/admin/contracts/[id]/page.tsx`
- Create: `src/app/admin/contracts/loading.tsx`
- Create: `src/app/admin/contracts/[id]/loading.tsx`
- Create: `src/components/contracts/ContractCreateForm.tsx`
- Create: `src/components/contracts/ContractTabs.tsx`
- Create: `src/components/contracts/ContractDetail.tsx`

**Interfaces:**
- Consumes:
  - `createContractAction(formData: FormData)`
  - `updateContractAction(formData: FormData)`
  - `createProjectAction(formData: FormData)`
- Produces:
  - `/admin/contracts`
  - `/admin/contracts/[id]`
  - `ContractDetailProps`

- [ ] **Step 1: Add server actions**

```ts
export async function createContractAction(formData: FormData) {
  const { supabase, activeOrganizationId } = await requireAdmin();
  if (!activeOrganizationId) return;

  const { data, error } = await supabase
    .from("contracts")
    .insert({
      organization_id: activeOrganizationId,
      contract_no: text(formData, "contract_no") ?? "",
      contract_type: text(formData, "contract_type") ?? "",
      customer_name: text(formData, "customer_name") ?? "",
      primary_site_id: text(formData, "primary_site_id"),
      status: text(formData, "status") ?? "draft",
      lifecycle_stage: text(formData, "lifecycle_stage") ?? "draft",
    })
    .select("id")
    .single();

  if (error || !data) return;
  redirect(`/admin/contracts/${data.id}`);
}
```

- [ ] **Step 2: Build the contracts list page**

Implementation requirements:

- query contracts ordered by `created_at desc`
- join summary site info through `primary_site_id`
- render a creation form above the list
- add links into each contract detail

- [ ] **Step 3: Build the contract detail page**

Implementation requirements:

- load one contract
- load linked contract sites, products, projects, phases, installation tasks, and services
- compute summary via `buildContractDetailSummary`
- render tabs: `Genel`, `Urunler ve Malzemeler`, `Kurulum`, `Servis ve Destek`, `IoT Operasyon`, `Zaman Cizgisi`
- keep IoT tab read-only placeholder in phase 1 with "bu modül sonraki fazda detaylanacak" copy

- [ ] **Step 4: Run targeted verification**

Run:

```bash
npm -C /Users/admin/Documents/Teknik/tsstakip-main run build
```

Manual verification:

- open `/admin/contracts`
- create a contract
- confirm redirect to `/admin/contracts/[id]`

- [ ] **Step 5: Commit**

```bash
git -C /Users/admin/Documents/Teknik add tsstakip-main/src/app/actions.ts tsstakip-main/src/app/admin/contracts tsstakip-main/src/components/contracts
git -C /Users/admin/Documents/Teknik commit -m "feat: add admin contract center pages"
```

## Task 4: Add site card and contract-linked installation board

**Files:**
- Create: `src/app/admin/sites/[id]/page.tsx`
- Create: `src/app/admin/sites/[id]/loading.tsx`
- Create: `src/components/contracts/SiteDetail.tsx`
- Create: `src/components/contracts/InstallationBoard.tsx`
- Modify: `src/app/actions.ts`

**Interfaces:**
- Consumes:
  - `createInstallationTaskAction(formData: FormData)`
  - `updateInstallationTaskStatusAction(formData: FormData)`
- Produces:
  - `/admin/sites/[id]`
  - `InstallationBoardProps`

- [ ] **Step 1: Add installation task actions**

```ts
export async function createInstallationTaskAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("installation_tasks").insert({
    project_phase_id: text(formData, "project_phase_id") ?? "",
    contract_id: text(formData, "contract_id") ?? "",
    site_id: text(formData, "site_id"),
    title: text(formData, "title") ?? "",
    task_type: text(formData, "task_type") ?? "field_installation",
    status: text(formData, "status") ?? "pending",
    assigned_team: text(formData, "assigned_team"),
  });
}
```

- [ ] **Step 2: Build installation board**

Implementation requirements:

- group tasks by `phase_key`
- show status chips
- show assigned member or subcontractor
- show overdue planned date with danger styling

- [ ] **Step 3: Build site card**

Implementation requirements:

- load one site from `customer_sites`
- load all `contract_sites` rows for that site
- load open services and open installation tasks linked to those contracts
- render sections: `Site Ozeti`, `Sozlesmeler`, `Acik Isler`, `Varliklar`
- leave `Varliklar` as phase-1 summary derived from `contract_products`, not a full asset register

- [ ] **Step 4: Verify with build and manual flow**

Run:

```bash
npm -C /Users/admin/Documents/Teknik/tsstakip-main run build
```

Manual verification:

- open `/admin/sites/[id]`
- confirm one site can show more than one linked contract
- confirm open installation tasks and services appear together

- [ ] **Step 5: Commit**

```bash
git -C /Users/admin/Documents/Teknik add tsstakip-main/src/app/admin/sites tsstakip-main/src/components/contracts/InstallationBoard.tsx tsstakip-main/src/components/contracts/SiteDetail.tsx tsstakip-main/src/app/actions.ts
git -C /Users/admin/Documents/Teknik commit -m "feat: add site card and installation board"
```

## Task 5: Link the existing service module to contracts

**Files:**
- Modify: `src/app/admin/services/new/page.tsx`
- Modify: `src/app/admin/services/[id]/page.tsx`
- Modify: `src/components/services/ServiceForm.tsx`
- Modify: `src/components/services/ServiceDetail.tsx`
- Modify: `src/app/actions.ts`

**Interfaces:**
- Consumes:
  - `contracts`
  - `projects`
  - `contract_sites`
- Produces:
  - service creation and edit flows that persist `contract_id`, `project_id`, `contract_site_id`

- [ ] **Step 1: Load contract lookup data into service pages**

Implementation requirements:

- fetch active contracts ordered by `contract_no`
- fetch projects for edit page based on selected contract
- fetch contract sites for selected contract

- [ ] **Step 2: Extend the service form**

Implementation requirements:

- add `Sozlesme` select before service detail fields
- add `Proje` select filtered by selected contract
- add `Sozlesme Sitesi` select filtered by selected contract
- preserve existing customer site selection behavior
- when a contract site is selected, use its linked site to prefill if the form is otherwise empty

- [ ] **Step 3: Persist new link fields in actions**

```ts
contract_id: text(formData, "contract_id"),
project_id: text(formData, "project_id"),
contract_site_id: text(formData, "contract_site_id"),
```

- [ ] **Step 4: Show contract context in service detail**

Implementation requirements:

- show contract number
- show contract type
- show linked project name
- show linked site role if present
- make contract number clickable back to `/admin/contracts/[id]`

- [ ] **Step 5: Run regression validation**

Run:

```bash
npm -C /Users/admin/Documents/Teknik/tsstakip-main run build
npm -C /Users/admin/Documents/Teknik/tsstakip-main run lint
```

Manual verification:

- create a contract-linked service
- create a service without a contract if business rules still allow it
- confirm old service-only flow is not broken

- [ ] **Step 6: Commit**

```bash
git -C /Users/admin/Documents/Teknik add tsstakip-main/src/app/admin/services/new/page.tsx tsstakip-main/src/app/admin/services/[id]/page.tsx tsstakip-main/src/components/services/ServiceForm.tsx tsstakip-main/src/components/services/ServiceDetail.tsx tsstakip-main/src/app/actions.ts
git -C /Users/admin/Documents/Teknik commit -m "feat: link services to contracts and projects"
```

## Task 6: Add admin dashboard entry points and rollout checks

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `README.md`
- Modify: `docs/HANDOVER.md`

**Interfaces:**
- Consumes: contract rollups from `contracts`, `projects`, `installation_tasks`
- Produces:
  - dashboard contract widgets
  - operator-facing rollout notes

- [ ] **Step 1: Add dashboard rollups**

Implementation requirements:

- total contracts
- contracts in installation
- contracts nearing renewal within 30 days
- sites with more than one active contract
- quick links to `/admin/contracts`

- [ ] **Step 2: Update operator documentation**

Documentation requirements:

- explain new contract center screens
- explain that one site may hold more than one contract
- explain phase-1 scope limitations: no full stock engine, no full IoT engine yet

- [ ] **Step 3: Run final validation**

Run:

```bash
npm -C /Users/admin/Documents/Teknik/tsstakip-main test
npm -C /Users/admin/Documents/Teknik/tsstakip-main run lint
npm -C /Users/admin/Documents/Teknik/tsstakip-main run build
```

Manual smoke checklist:

- create a contract and link at least one site
- create a project and installation task under that contract
- open the contract detail and confirm rollups render
- open the site card and confirm multiple contracts can appear
- create a service linked to the contract
- confirm contract detail shows linked service

- [ ] **Step 4: Commit**

```bash
git -C /Users/admin/Documents/Teknik add tsstakip-main/src/app/admin/page.tsx tsstakip-main/README.md tsstakip-main/docs/HANDOVER.md
git -C /Users/admin/Documents/Teknik commit -m "docs: add contract center rollout guidance"
```

## Self-Review

### Spec coverage

- contract center schema: covered by Task 1
- site to multi-contract relationship: covered by Tasks 1, 3, and 4
- contract detail and site detail views: covered by Tasks 3 and 4
- installation module: covered by Tasks 1 and 4
- service linkage to contracts: covered by Task 5
- phase-1 rollout boundaries: covered by Task 6 documentation

### Placeholder scan

- no `TODO`, `TBD`, or deferred implementation markers remain
- all new tables and routes referenced in later tasks are defined earlier in the plan

### Type consistency

- `contract_id`, `project_id`, and `contract_site_id` are used consistently across schema, actions, and service integration
- installation records consistently use `project_phase_id` and `contract_id`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-18-contract-centered-operations-phase-1.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
