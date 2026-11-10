import type { SupabaseClient } from "@supabase/supabase-js";
import { nextStatus } from "../domain/deal";
import type { ExtractedDeal } from "../ai/dealSchema";
import { newDealRow, rowToDeal, type DealRecord, type DealRow } from "./dealRows";

export type AuditActor = "creator" | "ai" | "system" | "paypal";

export function createDealStore(db: SupabaseClient) {
  async function getDeal(id: string): Promise<DealRecord> {
    const { data, error } = await db.from("deals").select("*").eq("id", id).single();
    if (error) throw new Error(`Load deal ${id} failed: ${error.message}`);
    return rowToDeal(data as DealRow);
  }

  // Changes a deal's status only if it is still in the status we expect, so two
  // requests can't both move the same deal (for example, two invoices sent).
  async function updateFrom(deal: DealRecord, changes: Partial<DealRow>): Promise<DealRecord> {
    const { data, error } = await db
      .from("deals")
      .update(changes)
      .eq("id", deal.id)
      .eq("status", deal.status)
      .select()
      .single();
    if (error) throw new Error(`Update deal ${deal.id} failed: ${error.message}`);
    return rowToDeal(data as DealRow);
  }

  return {
    getDeal,

    async createDeal(deal: ExtractedDeal, sourceEmail: string): Promise<DealRecord> {
      const { data, error } = await db.from("deals").insert(newDealRow(deal, sourceEmail)).select().single();
      if (error) throw new Error(`Save deal failed: ${error.message}`);
      return rowToDeal(data as DealRow);
    },    // Saves a PayPal webhook event. Returns false if this event was already fully processed,
    // so the caller can skip it. An event that arrived before but failed half-way returns true
    // again, so PayPal's retry gets another chance.
    async recordWebhookEvent(id: string, type: string, payload: unknown): Promise<boolean> {
      const { error } = await db.from("webhook_events").insert({ id, event_type: type, payload });
      if (!error) return true;
      if (error.code !== "23505") throw new Error(`Save webhook event failed: ${error.message}`); // 23505 = duplicate key

      const { data, error: readError } = await db.from("webhook_events").select("processed_at").eq("id", id).single();
      if (readError) throw new Error(`Read webhook event failed: ${readError.message}`);
      return data.processed_at === null;
    },

    async markWebhookProcessed(id: string): Promise<void> {
      const { error } = await db.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(`Mark webhook processed failed: ${error.message}`);
    },

        async listAudit(dealId: string): Promise<AuditEntry[]> {
      const { data, error } = await db
        .from("audit_log")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(`Load audit log failed: ${error.message}`);
      return (data as Array<{ id: number; created_at: string; actor: AuditActor; action: string; detail: unknown }>).map(
        (row) => ({ id: row.id, createdAt: new Date(row.created_at), actor: row.actor, action: row.action, detail: row.detail }),
      );
    },

    async listDeals(): Promise<DealRecord[]> {
      const { data, error } = await db.from("deals").select("*").order("created_at", { ascending: false });
      if (error) throw new Error(`List deals failed: ${error.message}`);
      return (data as DealRow[]).map(rowToDeal);
    },

    async markLive(id: string, proofUrl: string, now: Date): Promise<DealRecord> {
      const deal = await getDeal(id);
      const status = nextStatus(deal.status, "POST_LIVE"); // throws if not allowed
      return updateFrom(deal, { status, proof_url: proofUrl, live_at: now.toISOString() });
    },

    async markInvoiced(id: string, paypalInvoiceId: string, sentAt: Date, dueAt: Date): Promise<DealRecord> {
      const deal = await getDeal(id);
      const status = nextStatus(deal.status, "INVOICE_SENT");
      return updateFrom(deal, {
        status,
        paypal_invoice_id: paypalInvoiceId,
        invoice_sent_at: sentAt.toISOString(),
        invoice_due_at: dueAt.toISOString(),
      });
    },

    async markPaidByInvoice(paypalInvoiceId: string, paidAt: Date): Promise<DealRecord | null> {
      const { data, error } = await db.from("deals").select("*").eq("paypal_invoice_id", paypalInvoiceId).maybeSingle();
      if (error) throw new Error(`Find invoice ${paypalInvoiceId} failed: ${error.message}`);
      if (!data) return null; // not one of our invoices
      const deal = rowToDeal(data as DealRow);
      if (deal.status === "paid") return deal; // already recorded
      const status = nextStatus(deal.status, "PAID");
      return updateFrom(deal, { status, paid_at: paidAt.toISOString() });
    },

    async logAudit(dealId: string | null, actor: AuditActor, action: string, detail?: unknown): Promise<void> {
      const { error } = await db.from("audit_log").insert({ deal_id: dealId, actor, action, detail: detail ?? null });
      if (error) throw new Error(`Audit log failed: ${error.message}`);
    },
  };
}

export type DealStore = ReturnType<typeof createDealStore>;


export type AuditEntry = { id: number; createdAt: Date; actor: AuditActor; action: string; detail: unknown };


