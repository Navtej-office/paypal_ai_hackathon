import type { Deal } from "./types";

export type Summary = {
  owedCents: number;        // invoiced, not paid yet
  overdueCents: number;     // invoiced and past the due date
  paidCents: number;
  notInvoicedCents: number; // drafts and live posts with no invoice yet
};

export function summarize(deals: Deal[], now: Date): Summary {
  const summary: Summary = { owedCents: 0, overdueCents: 0, paidCents: 0, notInvoicedCents: 0 };

  for (const deal of deals) {
    switch (deal.status) {
      case "draft":
      case "live":
        summary.notInvoicedCents += deal.amountCents;
        break;
      case "invoiced":
        summary.owedCents += deal.amountCents;
        if (deal.invoice && now > deal.invoice.dueAt) summary.overdueCents += deal.amountCents;
        break;
      case "paid":
        summary.paidCents += deal.amountCents;
        break;
    }
  }
  return summary;
}