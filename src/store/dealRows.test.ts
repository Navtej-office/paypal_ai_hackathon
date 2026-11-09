import { describe, it, expect } from "vitest";
import { newDealRow, rowToDeal, type DealRow } from "./dealRows";
import type { ExtractedDeal } from "../ai/dealSchema";

const extracted: ExtractedDeal = {
  brandName: "Acme Gadgets",
  brandEmail: "partnerships@acme.example.com",
  deliverables: [{ platform: "youtube", type: "dedicated video" }],
  currency: "USD",
  termDays: 30,
  deadline: "2026-11-20",
  amountCents: 50000,
};

const baseRow: DealRow = {
  id: "11111111-1111-1111-1111-111111111111",
  created_at: "2026-11-09T10:00:00Z",
  brand_name: "Acme Gadgets",
  brand_email: "partnerships@acme.example.com",
  deliverables: [{ platform: "youtube", type: "dedicated video" }],
  amount_cents: 50000,
  currency: "USD",
  term_days: 30,
  deadline: "2026-11-20",
  status: "draft",
  source_email: "Hi Priya...",
  proof_url: null,
  live_at: null,
  paypal_invoice_id: null,
  invoice_sent_at: null,
  invoice_due_at: null,
  paid_at: null,
};

describe("newDealRow", () => {
  it("maps an extracted deal to database columns as a draft", () => {
    expect(newDealRow(extracted, "Hi Priya...")).toEqual({
      brand_name: "Acme Gadgets",
      brand_email: "partnerships@acme.example.com",
      deliverables: [{ platform: "youtube", type: "dedicated video" }],
      amount_cents: 50000,
      currency: "USD",
      term_days: 30,
      deadline: "2026-11-20",
      status: "draft",
      source_email: "Hi Priya...",
    });
  });

  it("stores a missing deadline as null", () => {
    const { deadline, ...noDeadline } = extracted;
    expect(newDealRow(noDeadline, "text").deadline).toBeNull();
  });
});

describe("rowToDeal", () => {
  it("maps a draft row to a deal", () => {
    const deal = rowToDeal(baseRow);
    expect(deal.id).toBe(baseRow.id);
    expect(deal.brandName).toBe("Acme Gadgets");
    expect(deal.status).toBe("draft");
    expect(deal.amountCents).toBe(50000);
    expect(deal.termDays).toBe(30);
    expect(deal.createdAt).toEqual(new Date("2026-11-09T10:00:00Z"));
  });

  it("leaves optional fields undefined instead of null", () => {
    const deal = rowToDeal(baseRow);
    expect(deal.liveAt).toBeUndefined();
    expect(deal.proofUrl).toBeUndefined();
    expect(deal.invoice).toBeUndefined();
  });

  it("turns live_at into a Date", () => {
    const deal = rowToDeal({ ...baseRow, status: "live", live_at: "2026-11-10T09:00:00Z", proof_url: "https://youtu.be/x" });
    expect(deal.liveAt).toEqual(new Date("2026-11-10T09:00:00Z"));
    expect(deal.proofUrl).toBe("https://youtu.be/x");
  });

  it("builds the invoice when the deal has been invoiced", () => {
    const deal = rowToDeal({
      ...baseRow,
      status: "invoiced",
      paypal_invoice_id: "INV2-ABC",
      invoice_sent_at: "2026-11-10T09:00:00Z",
      invoice_due_at: "2026-12-10T09:00:00Z",
    });
    expect(deal.invoice).toEqual({
      paypalId: "INV2-ABC",
      sentAt: new Date("2026-11-10T09:00:00Z"),
      dueAt: new Date("2026-12-10T09:00:00Z"),
      paidAt: undefined,
    });
  });

  it("includes the paid date once paid", () => {
    const deal = rowToDeal({
      ...baseRow,
      status: "paid",
      paypal_invoice_id: "INV2-ABC",
      invoice_sent_at: "2026-11-10T09:00:00Z",
      invoice_due_at: "2026-12-10T09:00:00Z",
      paid_at: "2026-11-12T09:00:00Z",
    });
    expect(deal.invoice?.paidAt).toEqual(new Date("2026-11-12T09:00:00Z"));
  });
});