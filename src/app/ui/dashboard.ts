import { needsAttention } from "../../domain/attention";
import { summarize } from "../../domain/summary";
import { DealRecord } from "../../store/dealRows";
import { dueLabel, formatMoney } from "../../ui/format";


const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Everything the dashboard page shows, worked out from the deals in one place.
export function buildDashboard(deals: DealRecord[], now: Date) {
  const summary = summarize(deals, now);

  return {
    totals: {
      owed: formatMoney(summary.owedCents),
      overdue: formatMoney(summary.overdueCents),
      paid: formatMoney(summary.paidCents),
      notInvoiced: formatMoney(summary.notInvoicedCents),
    },
    attention: needsAttention(deals, now).map((flag) => ({
      dealId: flag.dealId,
      kind: flag.kind,
      message:
        flag.kind === "OVERDUE"
          ? `${flag.brandName} hasn't paid: ${plural(flag.daysLate, "day")} overdue`
          : `${flag.brandName}: post is live but no invoice sent (${plural(flag.daysLate, "day")})`,
    })),
    rows: deals.map((deal) => ({
      id: deal.id,
      brandName: deal.brandName,
      amount: formatMoney(deal.amountCents),
      status: deal.status,
      label: dueLabel(deal, now),
    })),
  };
}