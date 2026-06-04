import type {
  Database,
  FinanceStatus,
  InvoiceMatchStatus,
  PayoutItemStatus,
} from "@/lib/supabase/types";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type InvoiceRow = Database["public"]["Tables"]["service_invoices"]["Row"];
type QueryResult = Promise<{ data: unknown[] | null; error: { message: string } | null }>;
type FilterChain = {
  eq: (column: string, value: string) => FilterChain;
  lte: (column: string, value: string) => FilterChain;
  or: (filter: string) => FilterChain;
  order: (column: string, options?: { ascending?: boolean }) => {
    limit: (count: number) => QueryResult;
  };
};
type SupabaseLike = {
  from: (table: string) => {
    select: (query: string) => FilterChain;
  };
};

const ABSOLUTE_MATCH_TOLERANCE = 5;
const PERCENT_MATCH_TOLERANCE = 0.05;

export function calculateExpectedRevenue(
  standardPrice: number | null,
  multiplier: number | null,
) {
  if (standardPrice === null) return null;
  const safeMultiplier = multiplier ?? 1;
  return roundCurrency(standardPrice * safeMultiplier);
}

export function calculateMarginEstimate(
  expectedRevenue: number | null,
  approvedCost: number | null,
) {
  if (expectedRevenue === null || approvedCost === null) return null;
  return roundCurrency(expectedRevenue - approvedCost);
}

export function determineFinanceStatusFromCosts(approvedCost: number | null): FinanceStatus {
  return approvedCost !== null ? "awaiting_invoice" : "awaiting_negotiation";
}

export function evaluateInvoiceMatch(
  approvedCost: number | null,
  invoiceAmount: number,
): { status: InvoiceMatchStatus; reason: string } {
  if (approvedCost === null) {
    return {
      status: "blocked",
      reason: "approved_cost_missing",
    };
  }

  const difference = Math.abs(invoiceAmount - approvedCost);
  if (difference <= 0.01) {
    return { status: "matched", reason: "exact_match" };
  }

  const percentDifference = approvedCost === 0 ? 1 : difference / approvedCost;
  if (difference <= ABSOLUTE_MATCH_TOLERANCE || percentDifference <= PERCENT_MATCH_TOLERANCE) {
    return { status: "needs_review", reason: "within_tolerance_review" };
  }

  return { status: "blocked", reason: "amount_mismatch" };
}

export function buildNextCutoffDefaults(now = new Date()) {
  const current = new Date(now);
  const currentDay = current.getDay();
  const daysUntilWednesday = (3 - currentDay + 7) % 7;
  const cutoff = new Date(current);
  cutoff.setDate(current.getDate() + daysUntilWednesday);
  cutoff.setHours(12, 0, 0, 0);

  if (cutoff <= current) {
    cutoff.setDate(cutoff.getDate() + 7);
  }

  const batchDate = new Date(cutoff);
  batchDate.setDate(cutoff.getDate() + 2);
  batchDate.setHours(12, 0, 0, 0);

  return { cutoff, batchDate };
}

export async function resolveServiceFinanceBaseline(
  supabase: unknown,
  catalogItemId: string | null,
  regionId: string | null,
) {
  const client = supabase as SupabaseLike;
  if (!catalogItemId) {
    return {
      standardPriceSnapshot: null,
      regionalMultiplierSnapshot: 1,
      expectedRevenue: null,
    };
  }

  const nowIso = new Date().toISOString();
  const { data: priceRows, error: priceError } = await client
    .from("catalog_price_versions")
    .select("base_price")
    .eq("catalog_item_id", catalogItemId)
    .lte("effective_from", nowIso)
    .or(`effective_to.is.null,effective_to.gt.${nowIso}`)
    .order("effective_from", { ascending: false })
    .limit(1);

  if (priceError) {
    throw new Error(priceError.message);
  }

  const standardPriceSnapshot =
    ((priceRows?.[0] as { base_price?: number } | undefined)?.base_price ?? null);

  if (!regionId) {
    return {
      standardPriceSnapshot,
      regionalMultiplierSnapshot: 1,
      expectedRevenue: calculateExpectedRevenue(standardPriceSnapshot, 1),
    };
  }

  const { data: multiplierRows, error: multiplierError } = await client
    .from("regional_price_multipliers")
    .select("multiplier")
    .eq("catalog_item_id", catalogItemId)
    .eq("region_id", regionId)
    .lte("effective_from", nowIso)
    .or(`effective_to.is.null,effective_to.gt.${nowIso}`)
    .order("effective_from", { ascending: false })
    .limit(1);

  if (multiplierError) {
    throw new Error(multiplierError.message);
  }

  const regionalMultiplierSnapshot =
    ((multiplierRows?.[0] as { multiplier?: number } | undefined)?.multiplier ?? 1);

  return {
    standardPriceSnapshot,
    regionalMultiplierSnapshot,
    expectedRevenue: calculateExpectedRevenue(
      standardPriceSnapshot,
      regionalMultiplierSnapshot,
    ),
  };
}

export function preparePayoutBatchItems(input: {
  invoices: InvoiceRow[];
  services: ServiceRow[];
  cutoffAt: string;
}) {
  const latestInvoiceByService = new Map<string, InvoiceRow>();
  for (const invoice of input.invoices) {
    const existing = latestInvoiceByService.get(invoice.service_id);
    if (!existing || existing.uploaded_at < invoice.uploaded_at) {
      latestInvoiceByService.set(invoice.service_id, invoice);
    }
  }

  const serviceById = new Map(input.services.map((service) => [service.id, service]));
  const items: Array<{
    invoiceId: string | null;
    serviceId: string;
    inclusionStatus: PayoutItemStatus;
    reasonCode: string;
  }> = [];

  const cutoffAt = new Date(input.cutoffAt).toISOString();
  for (const [serviceId, invoice] of latestInvoiceByService.entries()) {
    const service = serviceById.get(serviceId);
    if (!service) continue;

    let inclusionStatus: PayoutItemStatus = "included";
    let reasonCode = "eligible";

    if (invoice.match_status !== "matched") {
      inclusionStatus = "excluded";
      reasonCode =
        invoice.match_status === "needs_review"
          ? "invoice_needs_review"
          : "invoice_blocked";
    } else if (invoice.uploaded_at > cutoffAt) {
      inclusionStatus = "excluded";
      reasonCode = "uploaded_after_cutoff";
    }

    items.push({
      invoiceId: invoice.id,
      serviceId,
      inclusionStatus,
      reasonCode,
    });
  }

  return items;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
