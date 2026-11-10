"use client";

import { useActionState } from "react";
import { markLiveAction, sendInvoiceAction, type FormState } from "./actions";
import type { DealStatus } from "../../../domain/deal";

export function DealActions({ dealId, status }: { dealId: string; status: DealStatus }) {
  const [liveState, liveAction, livePending] = useActionState<FormState, FormData>(markLiveAction.bind(null, dealId), {});
  const [invoiceState, invoiceAction, invoicePending] = useActionState<FormState, FormData>(
    sendInvoiceAction.bind(null, dealId),
    {},
  );

  if (status === "draft") {
    return (
      <form action={liveAction}>
        <h3>Is the post live?</h3>
        <input name="proofUrl" type="url" placeholder="https://youtube.com/watch?v=..." required />
        {liveState.error && <p className="error">{liveState.error}</p>}
        <p>
          <button type="submit" disabled={livePending}>{livePending ? "Saving..." : "Mark as live"}</button>
        </p>
      </form>
    );
  }

  if (status === "live") {
    return (
      <form action={invoiceAction}>
        <h3>Ready to get paid</h3>
        <p className="muted">Sends the brand a PayPal invoice with your live post as proof.</p>
        {invoiceState.error && <p className="error">{invoiceState.error}</p>}
        <button type="submit" disabled={invoicePending}>{invoicePending ? "Sending invoice..." : "Send PayPal invoice"}</button>
      </form>
    );
  }

  return null; // invoiced or paid: nothing to do here
}