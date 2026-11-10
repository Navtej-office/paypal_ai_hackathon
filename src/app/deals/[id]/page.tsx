import { notFound } from "next/navigation";
import { getServices } from "../../../lib/services";
import { formatMoney, dueLabel } from "../../../ui/format";

export const dynamic = "force-dynamic";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getServices().store.getDeal(id).catch(() => null);
  if (!deal) notFound();

  return (
    <div className="card">
      <h1>{deal.brandName}</h1>
      <p>
        <strong>{formatMoney(deal.amountCents)}</strong> · {dueLabel(deal, new Date())}
      </p>
      <p className="muted">
        Brand email: {deal.brandEmail} · Payment terms: {deal.termDays === 0 ? "due on receipt" : `net ${deal.termDays}`}
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
    </div>
  );
}