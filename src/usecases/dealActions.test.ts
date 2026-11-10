import { describe, it, expect, vi } from "vitest";

import type { DealRecord } from "../store/dealRows";
import { markDealLive, SendInvoiceDeps, sendInvoiceForDeal } from "./dealActions";

const now = new Date(Date.UTC(2026, 10, 10, 12));
const DAY_MS = 24 * 60 * 60 * 1000;

const liveDeal: DealRecord = {
  id: "deal-1",
  createdAt: now,
  brandName: "Acme Gadgets",
  brandEmail: "sam@acme.example.com",
  deliverables: [{ platform: "youtube", type: "dedicated video" }],
  status: "live",
  amountCents: 50000,
  termDays: 30,
  liveAt: now,
  proofUrl: "https://youtube.com/watch?v=abc",
};

describe("markDealLive", () => {
  it("marks the deal live with the proof link and audits it", async () => {
    const store = {
      markLive: vi.fn().mockResolvedValue(liveDeal),
      logAudit: vi.fn().mockResolvedValue(undefined),
    };
    const result = await markDealLive("deal-1", "https://youtube.com/watch?v=abc", { store }, now);

    expect(result).toEqual({ ok: true, deal: liveDeal });
    expect(store.markLive).toHaveBeenCalledWith("deal-1", "https://youtube.com/watch?v=abc", now);
    expect(store.logAudit).toHaveBeenCalledWith("deal-1", "creator", "marked_live", {
      proofUrl: "https://youtube.com/watch?v=abc",
    });
  });

  it("rejects a proof link that isn't an https URL", async () => {
    const store = { markLive: vi.fn(), logAudit: vi.fn() };
    const result = await markDealLive("deal-1", "my video", { store }, now);

    expect(result).toEqual({ ok: false, error: "Proof link must be a full https:// URL" });
    expect(store.markLive).not.toHaveBeenCalled();
  });

  it("returns the store's error, e.g. when the deal is already live", async () => {
    const store = {
      markLive: vi.fn().mockRejectedValue(new Error("Invalid transition: live + POST_LIVE")),
      logAudit: vi.fn(),
    };
    const result = await markDealLive("deal-1", "https://youtu.be/x", { store }, now);

    expect(result).toEqual({ ok: false, error: "Invalid transition: live + POST_LIVE" });
  });
});

function fakeSendDeps(deal: DealRecord = liveDeal) {
  return {
    invoicerEmail: "creator@business.example.com",
    store: {
      getDeal: vi.fn().mockResolvedValue(deal),
      markInvoiced: vi.fn().mockResolvedValue({ ...deal, status: "invoiced" }),
      logAudit: vi.fn().mockResolvedValue(undefined),
    },
    paypal: {
      createAndSendInvoice: vi.fn().mockResolvedValue({ id: "INV2-123" }),
    },
  } satisfies SendInvoiceDeps;
}

describe("sendInvoiceForDeal", () => {
  it("refuses to invoice a deal whose post isn't live yet", async () => {
    const deps = fakeSendDeps({ ...liveDeal, status: "draft", proofUrl: undefined });
    const result = await sendInvoiceForDeal("deal-1", deps, now);

    expect(result).toEqual({ ok: false, error: "Mark the post live before sending an invoice" });
    expect(deps.paypal.createAndSendInvoice).not.toHaveBeenCalled();
  });

  it("sends a PayPal invoice to the brand with the amount and proof link", async () => {
    const deps = fakeSendDeps();
    await sendInvoiceForDeal("deal-1", deps, now);

    const payload = deps.paypal.createAndSendInvoice.mock.calls[0][0];
    expect(payload.invoicer.email_address).toBe("creator@business.example.com");
    expect(payload.primary_recipients[0].billing_info.email_address).toBe("sam@acme.example.com");
    expect(payload.items[0].unit_amount.value).toBe("500.00");
    expect(payload.items[0].name).toBe("Sponsored content: youtube dedicated video");
    expect(payload.detail.note).toContain("https://youtube.com/watch?v=abc");
    expect(payload.detail.payment_term.term_type).toBe("NET_30");
  });

  it("marks the deal invoiced with a due date from the payment terms", async () => {
    const deps = fakeSendDeps();
    await sendInvoiceForDeal("deal-1", deps, now);

    expect(deps.store.markInvoiced).toHaveBeenCalledWith("deal-1", "INV2-123", now, new Date(now.getTime() + 30 * DAY_MS));
  });

  it("audits the invoice", async () => {
    const deps = fakeSendDeps();
    await sendInvoiceForDeal("deal-1", deps, now);

    expect(deps.store.logAudit).toHaveBeenCalledWith("deal-1", "creator", "invoice_sent", {
      paypalInvoiceId: "INV2-123",
      amountCents: 50000,
    });
  });

  it("returns an error and doesn't mark the deal if PayPal fails", async () => {
    const deps = fakeSendDeps();
    deps.paypal.createAndSendInvoice.mockRejectedValue(new Error("PayPal create invoice failed: 422"));
    const result = await sendInvoiceForDeal("deal-1", deps, now);

    expect(result).toEqual({ ok: false, error: "PayPal create invoice failed: 422" });
    expect(deps.store.markInvoiced).not.toHaveBeenCalled();
  });

  it("names the PayPal invoice if it was sent but saving failed", async () => {
    const deps = fakeSendDeps();
    deps.store.markInvoiced.mockRejectedValue(new Error("Update deal failed"));
    const result = await sendInvoiceForDeal("deal-1", deps, now);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("INV2-123");
  });
});