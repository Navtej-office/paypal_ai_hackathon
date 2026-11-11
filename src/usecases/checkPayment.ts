import type { DealStore } from "../store/dealStore";

export type CheckPaymentDeps = {
  store: Pick<DealStore, "getDeal" | "markPaidByInvoice" | "logAudit">;
  paypal: { getInvoice(id: string): Promise<{ status: string; paid: boolean }> };
};

export type CheckPaymentResult =
  | { ok: true; paid: boolean; paypalStatus?: string }
  | { ok: false; error: string };

// Asks PayPal directly whether the deal's invoice is paid. A backup for missed webhooks.
export async function checkPayment(dealId: string, deps: CheckPaymentDeps, now: Date): Promise<CheckPaymentResult> {
  try {
    const deal = await deps.store.getDeal(dealId);
    if (deal.status === "paid") return { ok: true, paid: true };
    if (deal.status !== "invoiced" || !deal.invoice) {
      return { ok: false, error: "This deal has no invoice to check yet" };
    }

    const invoiceId = deal.invoice.paypalId;
    const info = await deps.paypal.getInvoice(invoiceId);
    if (!info.paid) return { ok: true, paid: false, paypalStatus: info.status };

    await deps.store.markPaidByInvoice(invoiceId, now);
    await deps.store.logAudit(dealId, "system", "marked_paid", { paypalInvoiceId: invoiceId, source: "check_payment" });
    return { ok: true, paid: true, paypalStatus: info.status };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}