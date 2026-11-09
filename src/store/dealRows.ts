import type { Deal } from "../domain/types";
import type { DealStatus } from "../domain/deal";
import type { ExtractedDeal } from "../ai/dealSchema";

// A row in the Supabase "deals" table, exactly as the database returns it.
export type DealRow = {
  id: string;
  created_at: string;
  brand_name: string;
  brand_email: string;
  deliverables: ExtractedDeal["deliverables"];
  amount_cents: number;
  currency: "USD";
  term_days: number;
  deadline: string | null;
  status: DealStatus;
  source_email: string | null;
  proof_url: string | null;
  live_at: string | null;
  paypal_invoice_id: string | null;
  invoice_sent_at: string | null;
  invoice_due_at: string | null;
  paid_at: string | null;
};

// Everything the app knows about a deal. It is also a valid Deal for attention and summary.
export type DealRecord = Deal & {
  createdAt: Date;
  brandEmail: string;
  deliverables: ExtractedDeal["deliverables"];
  termDays: number;
  deadline?: string;
  proofUrl?: string;
};

export type NewDealRow = Pick<
  DealRow,
  "brand_name" | "brand_email" | "deliverables" | "amount_cents" | "currency" | "term_days" | "deadline" | "status" | "source_email"
>;

export function newDealRow(deal: ExtractedDeal, sourceEmail: string): NewDealRow {
  return {
    brand_name: deal.brandName,
    brand_email: deal.brandEmail,
    deliverables: deal.deliverables,
    amount_cents: deal.amountCents,
    currency: deal.currency,
    term_days: deal.termDays,
    deadline: deal.deadline ?? null,
    status: "draft",
    source_email: sourceEmail,
  };
}

const toDate = (value: string | null) => (value ? new Date(value) : undefined);

export function rowToDeal(row: DealRow): DealRecord {
  const invoiced = row.paypal_invoice_id && row.invoice_sent_at && row.invoice_due_at;
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    brandName: row.brand_name,
    brandEmail: row.brand_email,
    deliverables: row.deliverables,
    status: row.status,
    amountCents: row.amount_cents,
    termDays: row.term_days,
    deadline: row.deadline ?? undefined,
    proofUrl: row.proof_url ?? undefined,
    liveAt: toDate(row.live_at),
    invoice: invoiced
      ? {
          paypalId: row.paypal_invoice_id!,
          sentAt: new Date(row.invoice_sent_at!),
          dueAt: new Date(row.invoice_due_at!),
          paidAt: toDate(row.paid_at),
        }
      : undefined,
  };
}