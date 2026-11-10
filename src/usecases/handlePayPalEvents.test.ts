import { describe, it, expect, vi } from "vitest";

import type { DealRecord } from "../store/dealRows";
import { handlePayPalEvent, WebhookDeps } from "./handlePayPalEvent";

const now = new Date(Date.UTC(2026, 10, 11, 9));

const paidEvent = {
  id: "WH-1",
  event_type: "INVOICING.INVOICE.PAID",
  create_time: "2026-11-11T08:30:00Z",
  resource: { invoice: { id: "INV2-123", status: "PAID" } },
};

function fakeDeps({ isNew = true, deal = { id: "deal-1", status: "paid" } as DealRecord | null } = {}) {
  return {
    store: {
      recordWebhookEvent: vi.fn().mockResolvedValue(isNew),
      markWebhookProcessed: vi.fn().mockResolvedValue(undefined),
      markPaidByInvoice: vi.fn().mockResolvedValue(deal),
      logAudit: vi.fn().mockResolvedValue(undefined),
    },
  } satisfies WebhookDeps;
}

describe("handlePayPalEvent", () => {
  it("records every event it receives", async () => {
    const deps = fakeDeps();
    await handlePayPalEvent(paidEvent, deps, now);
    expect(deps.store.recordWebhookEvent).toHaveBeenCalledWith("WH-1", "INVOICING.INVOICE.PAID", paidEvent);
  });

  it("marks the matching deal paid at the time PayPal reported", async () => {
    const deps = fakeDeps();
    const result = await handlePayPalEvent(paidEvent, deps, now);

    expect(result).toBe("paid");
    expect(deps.store.markPaidByInvoice).toHaveBeenCalledWith("INV2-123", new Date("2026-11-11T08:30:00Z"));
  });

  it("audits the payment as done by PayPal", async () => {
    const deps = fakeDeps();
    await handlePayPalEvent(paidEvent, deps, now);
    expect(deps.store.logAudit).toHaveBeenCalledWith("deal-1", "paypal", "marked_paid", { paypalInvoiceId: "INV2-123" });
  });

  it("does nothing the second time the same event arrives", async () => {
    const deps = fakeDeps({ isNew: false });
    const result = await handlePayPalEvent(paidEvent, deps, now);

    expect(result).toBe("duplicate");
    expect(deps.store.markPaidByInvoice).not.toHaveBeenCalled();
    expect(deps.store.logAudit).not.toHaveBeenCalled();
  });

  it("ignores invoices that aren't one of ours", async () => {
    const deps = fakeDeps({ deal: null });
    const result = await handlePayPalEvent(paidEvent, deps, now);

    expect(result).toBe("unknown_invoice");
    expect(deps.store.logAudit).not.toHaveBeenCalled();
  });

  it("ignores event types it doesn't handle, but still records them", async () => {
    const deps = fakeDeps();
    const result = await handlePayPalEvent({ ...paidEvent, event_type: "INVOICING.INVOICE.CREATED" }, deps, now);

    expect(result).toBe("ignored");
    expect(deps.store.recordWebhookEvent).toHaveBeenCalled();
    expect(deps.store.markPaidByInvoice).not.toHaveBeenCalled();
  });

  it("finds the invoice ID when PayPal puts it directly on the resource", async () => {
    const deps = fakeDeps();
    await handlePayPalEvent({ ...paidEvent, resource: { id: "INV2-999" } }, deps, now);
    expect(deps.store.markPaidByInvoice).toHaveBeenCalledWith("INV2-999", expect.any(Date));
  });

  it("uses the current time if PayPal sends no create_time", async () => {
    const deps = fakeDeps();
    const { create_time, ...noTime } = paidEvent;
    await handlePayPalEvent(noTime, deps, now);
    expect(deps.store.markPaidByInvoice).toHaveBeenCalledWith("INV2-123", now);
  });

  it("marks the event processed when done", async () => {
    const deps = fakeDeps();
    await handlePayPalEvent(paidEvent, deps, now);
    expect(deps.store.markWebhookProcessed).toHaveBeenCalledWith("WH-1");
  });

  it("rejects an event with no ID", async () => {
    const deps = fakeDeps();
    await expect(handlePayPalEvent({ event_type: "INVOICING.INVOICE.PAID" }, deps, now)).rejects.toThrow(
      "Webhook event has no id",
    );
  });
});