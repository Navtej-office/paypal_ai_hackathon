import type { FetchFn } from "./token";

export type PayPalClientOptions = {
  baseUrl: string;
  getToken: () => Promise<string>;
  fetchFn?: FetchFn;
};

export type InvoiceInfo = {
  id: string;
  status: string; // DRAFT, SENT, PAID, MARKED_AS_PAID, CANCELLED, ...
  paid: boolean;
  payUrl?: string; // link the brand opens to pay
};

const PAID_STATUSES = new Set(["PAID", "MARKED_AS_PAID"]);

export function createPayPalClient({ baseUrl, getToken, fetchFn = fetch }: PayPalClientOptions) {
  async function request(path: string, init: { method: string; body?: unknown }) {
    const token = await getToken();
    return fetchFn(`${baseUrl}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  }

  return {
    async createAndSendInvoice(payload: unknown): Promise<{ id: string }> {
      const created = await request("/v2/invoicing/invoices", { method: "POST", body: payload });
      if (!created.ok) {
        throw new Error(`PayPal create invoice failed: ${created.status} ${await created.text()}`);
      }
      const { id } = (await created.json()) as { id: string };

      const sent = await request(`/v2/invoicing/invoices/${id}/send`, {
        method: "POST",
        body: { send_to_recipient: true },
      });
      if (!sent.ok) {
        throw new Error(`PayPal send invoice ${id} failed: ${sent.status} ${await sent.text()}`);
      }
      return { id };
    },

    async getInvoice(id: string): Promise<InvoiceInfo> {
      const res = await request(`/v2/invoicing/invoices/${id}`, { method: "GET" });
      if (!res.ok) {
        throw new Error(`PayPal get invoice ${id} failed: ${res.status} ${await res.text()}`);
      }
      const data = (await res.json()) as {
        id: string;
        status: string;
        detail?: { metadata?: { recipient_view_url?: string } };
      };
      return {
        id: data.id,
        status: data.status,
        paid: PAID_STATUSES.has(data.status),
        payUrl: data.detail?.metadata?.recipient_view_url,
      };
    },
    
    // Asks PayPal whether a webhook really came from PayPal, using the signature headers it sent.
    async verifyWebhookSignature(input: {
      headers: Record<string, string | null | undefined>;
      event: unknown;
      webhookId: string;
    }): Promise<boolean> {
      const h = input.headers;
      const needed = [
        "paypal-auth-algo",
        "paypal-cert-url",
        "paypal-transmission-id",
        "paypal-transmission-sig",
        "paypal-transmission-time",
      ];
      if (needed.some((name) => !h[name])) return false;

      const res = await request("/v1/notifications/verify-webhook-signature", {
        method: "POST",
        body: {
          auth_algo: h["paypal-auth-algo"],
          cert_url: h["paypal-cert-url"],
          transmission_id: h["paypal-transmission-id"],
          transmission_sig: h["paypal-transmission-sig"],
          transmission_time: h["paypal-transmission-time"],
          webhook_id: input.webhookId,
          webhook_event: input.event,
        },
      });
      if (!res.ok) throw new Error(`PayPal verify webhook failed: ${res.status} ${await res.text()}`);
      const data = (await res.json()) as { verification_status?: string };
      return data.verification_status === "SUCCESS";
    },
  };
}