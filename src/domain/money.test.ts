import { describe, it, expect } from "vitest";
import { formatUsd, toCents } from "./money";


describe("toCents", () => {
  it("converts a whole dollar amount", () => {
    expect(toCents("500")).toBe(50000);
  });

  it("converts an amount with cents", () => {
    expect(toCents("19.99")).toBe(1999);
  });

  it("converts one decimal place", () => {
    expect(toCents("12.5")).toBe(1250);
  });

  it("avoids floating point errors", () => {
    expect(toCents("0.29")).toBe(29); // 0.29 * 100 = 28.999... in floats
  });

  it("rejects negative amounts", () => {
    expect(() => toCents("-5")).toThrow("Invalid amount");
  });

  it("rejects zero", () => {
    expect(() => toCents("0")).toThrow("Invalid amount");
  });

  it("rejects more than two decimal places", () => {
    expect(() => toCents("1.999")).toThrow("Invalid amount");
  });

  it("rejects text", () => {
    expect(() => toCents("abc")).toThrow("Invalid amount");
  });
});

describe("formatUsd", () => {
  it("formats cents as the string PayPal expects", () => {
    expect(formatUsd(35000)).toBe("350.00");
  });

  it("keeps leading zeros in cents", () => {
    expect(formatUsd(1205)).toBe("12.05");
  });
});