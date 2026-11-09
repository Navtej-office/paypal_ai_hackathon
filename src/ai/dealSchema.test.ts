import { describe, it, expect } from "vitest";
import { parseDeal } from "./dealSchema";

const valid = {
  brandName: "Acme Gadgets",
  brandEmail: "partnerships@acme.example.com",
  deliverables: [{ platform: "youtube", type: "dedicated video" }],
  amount: 500,
  currency: "USD",
  termDays: 30,
  deadline: "2026-11-20",
};

describe("parseDeal", () => {
  it("accepts a valid deal and converts the amount to cents", () => {
    const deal = parseDeal(valid);
    expect(deal.brandName).toBe("Acme Gadgets");
    expect(deal.amountCents).toBe(50000);
  });

  it("handles amounts with cents", () => {
    expect(parseDeal({ ...valid, amount: 349.99 }).amountCents).toBe(34999);
  });

  it("defaults to 30-day payment terms when none are given", () => {
    const { termDays, ...noTerms } = valid;
    expect(parseDeal(noTerms).termDays).toBe(30);
  });

  it("allows a missing deadline", () => {
    const { deadline, ...noDeadline } = valid;
    expect(parseDeal(noDeadline).deadline).toBeUndefined();
  });

  it("rejects a missing amount", () => {
    const { amount, ...noAmount } = valid;
    expect(() => parseDeal(noAmount)).toThrow("Invalid deal");
  });

  it("rejects a negative or zero amount", () => {
    expect(() => parseDeal({ ...valid, amount: -100 })).toThrow("Invalid deal");
    expect(() => parseDeal({ ...valid, amount: 0 })).toThrow("Invalid deal");
  });

  it("rejects currencies other than USD", () => {
    expect(() => parseDeal({ ...valid, currency: "EUR" })).toThrow("Invalid deal");
  });

  it("rejects an invalid brand email", () => {
    expect(() => parseDeal({ ...valid, brandEmail: "not-an-email" })).toThrow("Invalid deal");
  });

  it("rejects a deal with no deliverables", () => {
    expect(() => parseDeal({ ...valid, deliverables: [] })).toThrow("Invalid deal");
  });

  it("rejects payment terms PayPal doesn't support", () => {
    expect(() => parseDeal({ ...valid, termDays: 21 })).toThrow("Invalid deal");
  });

  it("says which field is wrong", () => {
    expect(() => parseDeal({ ...valid, currency: "EUR" })).toThrow("currency");
  });
});