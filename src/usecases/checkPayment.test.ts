import { describe, it, expect, vi } from "vitest";

import type { DealRecord } from "../store/dealRows";
import { checkPayment, CheckPaymentDeps } from "./checkPayment";

const now = new Date(Date.UTC(2026, 10, 11, 9));

const invoicedDeal = {
  id: "deal-1",
  status: "invoiced",
  invoice: { paypalId: "INV2-123", sentAt: now, dueAt: now },
} as DealRecord;

function fakeDeps(deal: DealRecord = invoicedDeal, paypalStatus = "PAID") {
  return {
    store: {
      getDeal: vi.fn().mockResolvedValue(deal),
      markPaidByInvoice: vi.fn().mockResolvedValue({ ...deal, status: "paid" }),
      logAudit: vi.fn().mockResolvedValue(undefined),
    },
    paypal: {
      getInvoice: vi.fn().mockResolvedValue({
        id: "INV2-123",
        status: paypalStatus,
        paid: paypalStatus === "PAID" || paypalStatus === "MARKED_AS_PAID",
      }),
    },
  } satisfies CheckPaymentDeps;
}

describe("checkPayment", () => {
  it("marks the deal paid when PayPal says the invoice is paid", async () => {
    const deps = fakeDeps();
    const result = await checkPayment("deal-1", deps, now);

    expect(result).toEqual({ ok: true, paid: true, paypalStatus: "PAID" });
    expect(deps.paypal.getInvoice).toHaveBeenCalledWith("INV2-123");
    expect(deps.store.markPaidByInvoice).toHaveBeenCalledWith("INV2-123", now);
  });

  it("audits it as a system check, not a webhook", async () => {
    const deps = fakeDeps();
    await checkPayment("deal-1", deps, now);
    expect(deps.store.logAudit).toHaveBeenCalledWith("deal-1", "system", "marked_paid", {
      paypalInvoiceId: "INV2-123",
      source: "check_payment",
    });
  });

  it("also counts payments recorded by hand in PayPal", async () => {
    const deps = fakeDeps(invoicedDeal, "MARKED_AS_PAID");
    expect(await checkPayment("deal-1", deps, now)).toEqual({ ok: true, paid: true, paypalStatus: "MARKED_AS_PAID" });
  });

  it("changes nothing when the invoice is still unpaid", async () => {
    const deps = fakeDeps(invoicedDeal, "SENT");
    const result = await checkPayment("deal-1", deps, now);

    expect(result).toEqual({ ok: true, paid: false, paypalStatus: "SENT" });
    expect(deps.store.markPaidByInvoice).not.toHaveBeenCalled();
    expect(deps.store.logAudit).not.toHaveBeenCalled();
  });

  it("does nothing for a deal that is already paid", async () => {
    const deps = fakeDeps({ ...invoicedDeal, status: "paid" } as DealRecord);
    const result = await checkPayment("deal-1", deps, now);

    expect(result).toEqual({ ok: true, paid: true });
    expect(deps.paypal.getInvoice).not.toHaveBeenCalled();
  });

  it("explains when there is no invoice to check yet", async () => {
    const deps = fakeDeps({ id: "deal-1", status: "live" } as DealRecord);
    const result = await checkPayment("deal-1", deps, now);

    expect(result).toEqual({ ok: false, error: "This deal has no invoice to check yet" });
  });

  it("returns PayPal errors instead of crashing", async () => {
    const deps = fakeDeps();
    deps.paypal.getInvoice.mockRejectedValue(new Error("PayPal get invoice INV2-123 failed: 500"));
    const result = await checkPayment("deal-1", deps, now);

    expect(result).toEqual({ ok: false, error: "PayPal get invoice INV2-123 failed: 500" });
  });
});