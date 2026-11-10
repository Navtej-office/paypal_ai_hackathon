import { buildInvoice } from "../paypal/payload";
import type { DealStore } from "../store/dealStore";
import type { DealRecord } from "../store/dealRows";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ActionResult = { ok: true; deal: DealRecord } | { ok: false; error: string };

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

// The creator says the sponsored post is live and gives its link as proof.
export async function markDealLive(
  dealId: string,
  proofUrl: string,
  deps: { store: Pick<DealStore, "markLive" | "logAudit"> },
  now: Date,
): Promise<ActionResult> {
  const url = proofUrl.trim();
  if (!isHttpsUrl(url)) return { ok: false, error: "Proof link must be a full https:// URL" };
  try {
    const deal = await deps.store.markLive(dealId, url, now);
    await deps.store.logAudit(dealId, "creator", "marked_live", { proofUrl: url });
    return { ok: true, deal };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export type SendInvoiceDeps = {
  invoicerEmail: string;
  store: Pick<DealStore, "getDeal" | "markInvoiced" | "logAudit">;
  paypal: { createAndSendInvoice(payload: unknown): Promise<{ id: string }> };
};

// Sends the brand a PayPal invoice with the live post as proof, then records it.
export async function sendInvoiceForDeal(dealId: string, deps: SendInvoiceDeps, now: Date): Promise<ActionResult> {
  let paypalInvoiceId: string | undefined;
  try {
    const deal = await deps.store.getDeal(dealId);
    if (deal.status !== "live" || !deal.proofUrl) {
      return { ok: false, error: "Mark the post live before sending an invoice" };
    }

    const payload = buildInvoice({
      invoicerEmail: deps.invoicerEmail,
      brandEmail: deal.brandEmail,
      brandName: deal.brandName,
      description: `Sponsored content: ${deal.deliverables.map((d) => `${d.platform} ${d.type}`).join(", ")}`,
      amountCents: deal.amountCents,
      termDays: deal.termDays,
      proofUrl: deal.proofUrl,
    });

    paypalInvoiceId = (await deps.paypal.createAndSendInvoice(payload)).id;
    const dueAt = new Date(now.getTime() + deal.termDays * DAY_MS);
    const updated = await deps.store.markInvoiced(dealId, paypalInvoiceId, now, dueAt);
    await deps.store.logAudit(dealId, "creator", "invoice_sent", { paypalInvoiceId, amountCents: deal.amountCents });
    return { ok: true, deal: updated };
  } catch (err) {
    const message = (err as Error).message;
    return {
      ok: false,
      error: paypalInvoiceId ? `PayPal invoice ${paypalInvoiceId} was sent, but saving failed: ${message}` : message,
    };
  }
}