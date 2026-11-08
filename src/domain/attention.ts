import type { Deal } from "./types";

export type AttentionFlag = {
  dealId: string;
  brandName: string;
  kind: "OVERDUE" | "LIVE_NOT_INVOICED";
  daysLate: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / DAY_MS);

export function needsAttention(deals: Deal[], now: Date): AttentionFlag[] {
  const flags: AttentionFlag[] = [];

  for (const deal of deals) {
    if (deal.status === "invoiced" && deal.invoice && now > deal.invoice.dueAt) {
      flags.push({ dealId: deal.id, brandName: deal.brandName, kind: "OVERDUE", daysLate: daysBetween(deal.invoice.dueAt, now) });
    }
    if (deal.status === "live" && deal.liveAt && daysBetween(deal.liveAt, now) >= 1) {
      flags.push({ dealId: deal.id, brandName: deal.brandName, kind: "LIVE_NOT_INVOICED", daysLate: daysBetween(deal.liveAt, now) });
    }
  }

  // Overdue invoices first, then the longest-waiting within each kind.
  return flags.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "OVERDUE" ? -1 : 1;
    return b.daysLate - a.daysLate;
  });
}