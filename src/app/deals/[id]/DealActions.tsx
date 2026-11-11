"use client";

import { useActionState } from "react";
import type { DealStatus } from "../../../domain/deal";
  import { markLiveAction, sendInvoiceAction, checkPaymentAction, type FormState } from "./actions";

export function DealActions({ dealId, status }: { dealId: string; status: DealStatus }) {
  const [liveState, liveAction, livePending] = useActionState<FormState, FormData>(markLiveAction.bind(null, dealId), {});
  const [invoiceState, invoiceAction, invoicePending] = useActionState<FormState, FormData>(
    sendInvoiceAction.bind(null, dealId),
    {},
  );

  const [checkState, checkAction, checkPending] = useActionState<FormState, FormData>(
      checkPaymentAction.bind(null, dealId),
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

      if (status === "invoiced") {
      return (
        <form action={checkAction}>
          <h3>Waiting for the brand to pay</h3>
          <p className="muted">Dealflow updates automatically when PayPal reports the payment. You can also check now.</p>
          {checkState.error && <p className="error">{checkState.error}</p>}
          {checkState.message && <p className="muted">{checkState.message}</p>}
          <button type="submit" disabled={checkPending}>{checkPending ? "Checking PayPal..." : "Check payment"}</button>
        </form>
      );
    }

    return null; // paid: nothing to do here

}