import { describe, it, expect } from "vitest";
import { nextStatus } from "./deal";


describe("nextStatus", () => {
  it("moves a draft deal to live when the post goes live", () => {
    expect(nextStatus("draft", "POST_LIVE")).toBe("live");
  });

  it("moves a live deal to invoiced when the invoice is sent", () => {
    expect(nextStatus("live", "INVOICE_SENT")).toBe("invoiced");
  });

  it("moves an invoiced deal to paid when payment arrives", () => {
    expect(nextStatus("invoiced", "PAID")).toBe("paid");
  });

  it("rejects invoicing before the post is live", () => {
    expect(() => nextStatus("draft", "INVOICE_SENT")).toThrow("Invalid transition: draft + INVOICE_SENT");
  });

  it("rejects payment before an invoice is sent", () => {
    expect(() => nextStatus("live", "PAID")).toThrow("Invalid transition");
  });

  it("treats paid as final", () => {
    expect(() => nextStatus("paid", "POST_LIVE")).toThrow("Invalid transition");
  });
});