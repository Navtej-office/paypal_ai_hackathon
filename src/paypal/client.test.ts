import { describe, it, expect, vi } from "vitest";
import { createPayPalClient } from "./client";

const baseUrl = "https://api-m.sandbox.paypal.com";
const getToken = async () => "test-token";
const payload = { detail: { currency_code: "USD" }, items: [] };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
describe("verifyWebhookSignature", () => {
  const headers = {
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
    "paypal-transmission-id": "TX-1",
    "paypal-transmission-sig": "SIG",
    "paypal-transmission-time": "2026-11-11T08:30:00Z",
  };
  const event = { id: "WH-1", event_type: "INVOICING.INVOICE.PAID" };

  it("asks PayPal to verify the event with the webhook ID and signature headers", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(json({ verification_status: "SUCCESS" }));
    const client = createPayPalClient({ baseUrl, getToken, fetchFn });

    await client.verifyWebhookSignature({ headers, event, webhookId: "WEBHOOK-ID" });

    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${baseUrl}/v1/notifications/verify-webhook-signature`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      auth_algo: "SHA256withRSA",
      cert_url: "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
      transmission_id: "TX-1",
      transmission_sig: "SIG",
      transmission_time: "2026-11-11T08:30:00Z",
      webhook_id: "WEBHOOK-ID",
      webhook_event: event,
    });
  });

  it("returns true when PayPal says SUCCESS", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(json({ verification_status: "SUCCESS" }));
    const client = createPayPalClient({ baseUrl, getToken, fetchFn });
    expect(await client.verifyWebhookSignature({ headers, event, webhookId: "W" })).toBe(true);
  });

  it("returns false when PayPal says FAILURE", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(json({ verification_status: "FAILURE" }));
    const client = createPayPalClient({ baseUrl, getToken, fetchFn });
    expect(await client.verifyWebhookSignature({ headers, event, webhookId: "W" })).toBe(false);
  });

  it("returns false without calling PayPal when signature headers are missing", async () => {
    const fetchFn = vi.fn();
    const client = createPayPalClient({ baseUrl, getToken, fetchFn });
    const { "paypal-transmission-sig": _, ...missing } = headers;

    expect(await client.verifyWebhookSignature({ headers: missing, event, webhookId: "W" })).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("throws if the verification request itself fails", async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(json({ name: "INTERNAL_SERVER_ERROR" }, 500));
    const client = createPayPalClient({ baseUrl, getToken, fetchFn });
    await expect(client.verifyWebhookSignature({ headers, event, webhookId: "W" })).rejects.toThrow(
      "PayPal verify webhook failed: 500",
    );
  });
});


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