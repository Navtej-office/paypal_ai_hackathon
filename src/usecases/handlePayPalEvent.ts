import type { DealStore } from "../store/dealStore";

export type PayPalEvent = {
  id?: string;
  event_type?: string;
  create_time?: string;
  resource?: { id?: string; invoice?: { id?: string } };
};

export type WebhookDeps = {
  store: Pick<DealStore, "markPaidByInvoice" | "logAudit"> & {
    recordWebhookEvent(id: string, type: string, payload: unknown): Promise<boolean>; // false if seen before
    markWebhookProcessed(id: string): Promise<void>;
  };
};

export type WebhookResult = "paid" | "duplicate" | "ignored" | "unknown_invoice";

const PAID_EVENTS = new Set(["INVOICING.INVOICE.PAID"]);

// Handles one PayPal webhook event. Safe to call twice with the same event.
export async function handlePayPalEvent(event: PayPalEvent, deps: WebhookDeps, now: Date): Promise<WebhookResult> {
  if (!event.id) throw new Error("Webhook event has no id");
  const type = event.event_type ?? "UNKNOWN";

  const isNew = await deps.store.recordWebhookEvent(event.id, type, event);
  if (!isNew) return "duplicate";

  let result: WebhookResult = "ignored";
  if (PAID_EVENTS.has(type)) {
    const invoiceId = event.resource?.invoice?.id ?? event.resource?.id;
    if (invoiceId) {
      const paidAt = event.create_time ? new Date(event.create_time) : now;
      const deal = await deps.store.markPaidByInvoice(invoiceId, paidAt);
      if (deal) {
        await deps.store.logAudit(deal.id, "paypal", "marked_paid", { paypalInvoiceId: invoiceId });
        result = "paid";
      } else {
        result = "unknown_invoice";
      }
    }
  }

  await deps.store.markWebhookProcessed(event.id);
  return result;
}