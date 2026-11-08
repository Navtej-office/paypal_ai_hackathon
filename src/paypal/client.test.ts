import { describe, it, expect, vi } from "vitest";
import { createPayPalClient } from "./client";

const baseUrl = "https://api-m.sandbox.paypal.com";
const getToken = async () => "test-token";
const payload = { detail: { currency_code: "USD" }, items: [] };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("createAndSendInvoice", () => {
  it("creates the invoice with the token and full-response header", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(json({ id: "INV2-123", status: "DRAFT" }, 201))
      .mockResolvedValueOnce(json({}, 200));
    const client = createPayPalClient({ baseUrl, getToken, fetchFn });

    await client.createAndSendInvoice(payload);

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${baseUrl}/v2/invoicing/invoices`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(init.headers.Prefer).toBe("return=representation");
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it("then sends the invoice to the brand", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(json({ id: "INV2-123", status: "DRAFT" }, 201))
      .mockResolvedValueOnce(json({}, 200));
    const client = createPayPalClient({ baseUrl, getToken, fetchFn });

    await client.createAndSendInvoice(payload);

    const [url, init] = fetchFn.mock.calls[1];
    expect(url).toBe(`${baseUrl}/v2/invoicing/invoices/INV2-123/send`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ send_to_recipient: true });
  });

  it("returns the PayPal invoice ID", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(json({ id: "INV2-123", status: "DRAFT" }, 201))
      .mockResolvedValueOnce(json({}, 200));
    const client = createPayPalClient({ baseUrl, getToken, fetchFn });

    expect(await client.createAndSendInvoice(payload)).toEqual({ id: "INV2-123" });
  });

  it("does not try to send if creating the invoice fails", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(json({ name: "INVALID_REQUEST" }, 400));
    const client = createPayPalClient({ baseUrl, getToken, fetchFn });

    await expect(client.createAndSendInvoice(payload)).rejects.toThrow("PayPal create invoice failed: 400");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("reports which invoice failed to send", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(json({ id: "INV2-123", status: "DRAFT" }, 201))
      .mockResolvedValueOnce(json({ name: "UNPROCESSABLE_ENTITY" }, 422));
    const client = createPayPalClient({ baseUrl, getToken, fetchFn });

    await expect(client.createAndSendInvoice(payload)).rejects.toThrow("PayPal send invoice INV2-123 failed: 422");
  });
});