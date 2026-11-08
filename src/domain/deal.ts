export type DealStatus = "draft" | "live" | "invoiced" | "paid";
export type DealEvent = "POST_LIVE" | "INVOICE_SENT" | "PAID";

const transitions: Record<DealStatus, Partial<Record<DealEvent, DealStatus>>> = {
  draft: { POST_LIVE: "live" },
  live: { INVOICE_SENT: "invoiced" },
  invoiced: { PAID: "paid" },
  paid: {},
};

export function nextStatus(current: DealStatus, event: DealEvent): DealStatus {
  const next = transitions[current][event];
  if (!next) throw new Error(`Invalid transition: ${current} + ${event}`);
  return next;
}