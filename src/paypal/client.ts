import type { FetchFn } from "./token";

export type PayPalClientOptions = {
  baseUrl: string;
  getToken: () => Promise<string>;
  fetchFn?: FetchFn;
};

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
  };
}