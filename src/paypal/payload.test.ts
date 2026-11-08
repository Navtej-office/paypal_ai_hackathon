import { describe, it, expect } from "vitest";
import { buildInvoice, InvoiceInput } from "./payload";


const input: InvoiceInput = {
  invoicerEmail: "creator@business.example.com",
  brandEmail: "brand@personal.example.com",
  brandName: "Acme Gadgets",
  description: "Sponsored YouTube video",
  amountCents: 35000,
  termDays: 30,
  proofUrl: "https://youtube.com/watch?v=abc123",
};

describe("buildInvoice", () => {
  it("bills the brand's email", () => {
    const invoice = buildInvoice(input);
    expect(invoice.primary_recipients[0].billing_info.email_address).toBe("brand@personal.example.com");
  });

  it("sends from the creator's PayPal account", () => {
    expect(buildInvoice(input).invoicer.email_address).toBe("creator@business.example.com");
  });

  it("uses USD and formats the amount as a string", () => {
    const item = buildInvoice(input).items[0];
    expect(item.unit_amount).toEqual({ currency_code: "USD", value: "350.00" });
    expect(item.quantity).toBe("1");
    expect(item.name).toBe("Sponsored YouTube video");
  });

  it("puts the proof link in the note", () => {
    expect(buildInvoice(input).detail.note).toContain("https://youtube.com/watch?v=abc123");
  });

  it("maps 30 days to PayPal's NET_30 term", () => {
    expect(buildInvoice(input).detail.payment_term.term_type).toBe("NET_30");
  });

  it("maps 0 days to DUE_ON_RECEIPT", () => {
    expect(buildInvoice({ ...input, termDays: 0 }).detail.payment_term.term_type).toBe("DUE_ON_RECEIPT");
  });

  it("rejects payment terms PayPal doesn't support", () => {
    expect(() => buildInvoice({ ...input, termDays: 21 })).toThrow("Unsupported payment term");
  });

  it("rejects a proof link that isn't https", () => {
    expect(() => buildInvoice({ ...input, proofUrl: "not a link" })).toThrow("Invalid proof URL");
  });
});