import { describe, it, expect } from "vitest";

import type { Deal } from "./types";
import { needsAttention } from "./attention";

const day = (d: number) => new Date(Date.UTC(2026, 10, d)); // November 2026

const invoiced = (id: string, dueDay: number): Deal => ({
  id,
  brandName: `Brand ${id}`,
  status: "invoiced",
  amountCents: 50000,
  liveAt: day(1),
  invoice: { paypalId: `INV-${id}`, sentAt: day(1), dueAt: day(dueDay) },
});

describe("needsAttention", () => {
  it("returns nothing when there are no deals", () => {
    expect(needsAttention([], day(10))).toEqual([]);
  });

  it("flags an invoice past its due date as overdue, with days late", () => {
    expect(needsAttention([invoiced("a", 5)], day(8))).toEqual([
      { dealId: "a", brandName: "Brand a", kind: "OVERDUE", daysLate: 3 },
    ]);
  });

  it("does not flag an invoice that is not due yet", () => {
    expect(needsAttention([invoiced("a", 20)], day(8))).toEqual([]);
  });

  it("does not flag an invoice on its due date", () => {
    expect(needsAttention([invoiced("a", 8)], day(8))).toEqual([]);
  });

  it("flags a post that has been live over a day without an invoice", () => {
    const deal: Deal = { id: "b", brandName: "Brand b", status: "live", amountCents: 30000, liveAt: day(5) };
    expect(needsAttention([deal], day(7))).toEqual([
      { dealId: "b", brandName: "Brand b", kind: "LIVE_NOT_INVOICED", daysLate: 2 },
    ]);
  });

  it("gives a post live for under a day time to be invoiced", () => {
    const deal: Deal = { id: "b", brandName: "Brand b", status: "live", amountCents: 30000, liveAt: day(7) };
    expect(needsAttention([deal], day(7))).toEqual([]);
  });

  it("never flags paid or draft deals", () => {
    const paid: Deal = { ...invoiced("c", 1), status: "paid" };
    const draft: Deal = { id: "d", brandName: "Brand d", status: "draft", amountCents: 10000 };
    expect(needsAttention([paid, draft], day(20))).toEqual([]);
  });

  it("puts the most overdue deals first", () => {
    const flags = needsAttention([invoiced("a", 15), invoiced("b", 5), invoiced("c", 10)], day(20));
    expect(flags.map((f) => f.dealId)).toEqual(["b", "c", "a"]);
  });
});