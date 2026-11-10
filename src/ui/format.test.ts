import { describe, it, expect } from "vitest";

import type { Deal } from "../domain/types";
import { dueLabel, formatMoney } from "./format";

const day = (d: number, hour = 0) => new Date(Date.UTC(2026, 10, d, hour));

describe("formatMoney", () => {
  it("formats cents as dollars", () => {
    expect(formatMoney(50000)).toBe("$500.00");
  });

  it("keeps cents", () => {
    expect(formatMoney(1999)).toBe("$19.99");
  });

  it("adds thousands separators", () => {
    expect(formatMoney(125050)).toBe("$1,250.50");
    expect(formatMoney(123456789)).toBe("$1,234,567.89");
  });

  it("shows zero", () => {
    expect(formatMoney(0)).toBe("$0.00");
  });
});

const invoicedDue = (dueDay: number): Deal => ({
  id: "a",
  brandName: "Acme",
  status: "invoiced",
  amountCents: 50000,
  liveAt: day(1),
  invoice: { paypalId: "INV2-A", sentAt: day(1), dueAt: day(dueDay) },
});

describe("dueLabel", () => {
  it("says a draft isn't live yet", () => {
    expect(dueLabel({ id: "a", brandName: "Acme", status: "draft", amountCents: 1 }, day(5))).toBe("Not live yet");
  });

  it("reminds that a live post needs an invoice", () => {
    expect(dueLabel({ id: "a", brandName: "Acme", status: "live", amountCents: 1, liveAt: day(4) }, day(5))).toBe(
      "Live, not invoiced",
    );
  });

  it("counts days until the due date", () => {
    expect(dueLabel(invoicedDue(15), day(10))).toBe("Due in 5 days");
  });

  it("says tomorrow for one day left", () => {
    expect(dueLabel(invoicedDue(11), day(10))).toBe("Due tomorrow");
  });

  it("says today on the due date", () => {
    expect(dueLabel(invoicedDue(10), day(10))).toBe("Due today");
  });

  it("counts days overdue", () => {
    expect(dueLabel(invoicedDue(10), day(13))).toBe("3 days overdue");
  });

  it("uses singular for one day overdue", () => {
    expect(dueLabel(invoicedDue(10), day(11))).toBe("1 day overdue");
  });

  it("marks a few hours past due as overdue", () => {
    expect(dueLabel(invoicedDue(10), day(10, 5))).toBe("Overdue");
  });

  it("says paid once paid", () => {
    expect(dueLabel({ ...invoicedDue(10), status: "paid" }, day(20))).toBe("Paid");
  });
});