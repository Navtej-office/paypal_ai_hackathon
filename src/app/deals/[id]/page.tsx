import { notFound } from "next/navigation";
import { getServices } from "../../../lib/services";
import { formatMoney, dueLabel } from "../../../ui/format";
import { DealActions } from "./DealActions";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  deal_extracted: "AI read the brand email and created this deal",
  marked_live: "Post marked live",
  invoice_sent: "PayPal invoice sent",
  marked_paid: "Payment received",
};

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { store, paypal } = getServices();
  const deal = await store.getDeal(id).catch(() => null);
  if (!deal) notFound();

  const audit = await store.listAudit(id).catch(() => []);
  const paypalInvoice = deal.invoice ? await paypal.getInvoice(deal.invoice.paypalId).catch(() => null) : null;

  return (
    <>
      <div className="card">
        <h1>{deal.brandName}</h1>
        <p>
          <strong>{formatMoney(deal.amountCents)}</strong> · {dueLabel(deal, new Date())}
        </p>
        <p className="muted">
          Brand email: {deal.brandEmail} · Payment terms: {deal.termDays === 0 ? "due on receipt" : `pay within ${deal.termDays} days`}
          {deal.deadline && ` · Publish by ${deal.deadline}`}
        </p>
        <h3>Deliverables</h3>
        <ul>
          {deal.deliverables.map((d, i) => (
            <li key={i}>
              {d.platform}: {d.type}
            </li>
          ))}
        </ul>
        {deal.proofUrl && (
          <p>
            Proof: <a href={deal.proofUrl} target="_blank" rel="noreferrer">{deal.proofUrl}</a>
          </p>
        )}
        {deal.invoice && (
          <p>
            PayPal invoice {deal.invoice.paypalId}
            {paypalInvoice && ` · status ${paypalInvoice.status}`}
            {paypalInvoice?.payUrl && (
              <>
                {" · "}
                <a href={paypalInvoice.payUrl} target="_blank" rel="noreferrer">View invoice</a>
              </>
            )}
          </p>
        )}
      </div>

      <div className="card">
        <DealActions dealId={deal.id} status={deal.status} />
        {deal.status === "paid" && <p>Paid. Nice work.</p>}
      </div>

      <div className="card">
        <h3>History</h3>
        {audit.length === 0 ? (
          <p className="muted">No activity yet.</p>
        ) : (
          <ul>
            {audit.map((entry) => (
              <li key={entry.id}>
                {entry.createdAt.toLocaleString("en-IN")} · <strong>{entry.actor}</strong> ·{" "}
                {ACTION_LABELS[entry.action] ?? entry.action}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}