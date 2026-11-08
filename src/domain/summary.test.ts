import { describe, it, expect } from "vitest";

import type { Deal } from "./types";
import { summarize } from "./summary";

const day = (d: number) => new Date(Date.UTC(2026, 10, d));

const deals: Deal[] = [
  { id: "1", brandName: "A", status: "draft", amountCents: 10000 },
  { id: "2", brandName: "B", status: "live", amountCents: 20000, liveAt: day(1) },
  {
    id: "3", brandName: "C", status: "invoiced", amountCents: 30000, liveAt: day(1),
    invoice: { paypalId: "INV-3", sentAt: day(1), dueAt: day(30) }, // not due yet
  },
  {
    id: "4", brandName: "D", status: "invoiced", amountCents: 40000, liveAt: day(1),
    invoice: { paypalId: "INV-4", sentAt: day(1), dueAt: day(5) }, // overdue on day 10
  },
  {
    id: "5", brandName: "E", status: "paid", amountCents: 50000, liveAt: day(1),
    invoice: { paypalId: "INV-5", sentAt: day(1), dueAt: day(5), paidAt: day(4) },
  },
];

describe("summarize", () => {
  it("returns zeros for no deals", () => {
    expect(summarize([], day(10))).toEqual({ owedCents: 0, overdueCents: 0, paidCents: 0, notInvoicedCents: 0 });
  });

  it("counts invoiced but unpaid deals as owed", () => {
    expect(summarize(deals, day(10)).owedCents).toBe(70000);
  });

  it("counts only invoices past their due date as overdue", () => {
    expect(summarize(deals, day(10)).overdueCents).toBe(40000);
  });

  it("counts paid deals", () => {
    expect(summarize(deals, day(10)).paidCents).toBe(50000);
  });

  it("counts drafts and live deals as not invoiced yet", () => {
    expect(summarize(deals, day(10)).notInvoicedCents).toBe(30000);
  });
});