import { extractDeal, type LlmCall } from "../ai/extractDeal";
import type { DealStore } from "../store/dealStore";
import type { DealRecord } from "../store/dealRows";

export type CreateDealDeps = {
  llm: LlmCall;
  store: Pick<DealStore, "createDeal" | "logAudit">;
};

export type CreateDealResult = { ok: true; deal: DealRecord } | { ok: false; error: string };

// Paste a brand email -> AI extracts the deal -> save it as a draft -> audit it.
export async function createDealFromEmail(emailText: string, deps: CreateDealDeps): Promise<CreateDealResult> {
  try {
    const extracted = await extractDeal(emailText, deps.llm);
    const deal = await deps.store.createDeal(extracted, emailText);
    await deps.store.logAudit(deal.id, "ai", "deal_extracted", {
      brandName: deal.brandName,
      amountCents: deal.amountCents,
    });
    return { ok: true, deal };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}