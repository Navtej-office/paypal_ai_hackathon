import Link from "next/link";
import { getServices } from "../lib/services";
import { buildDashboard } from "./ui/dashboard";


export const dynamic = "force-dynamic"; // always load fresh data

export default async function DashboardPage() {
  let view: ReturnType<typeof buildDashboard>;
  try {
    view = buildDashboard(await getServices().store.listDeals(), new Date());
  } catch (err) {
    return <p className="error">Could not load deals: {(err as Error).message}</p>;
  }

  return (
    <>
      <div className="totals">
        <div className="card"><div className="muted">Owed to you</div><div className="big">{view.totals.owed}</div></div>
        <div className="card"><div className="muted">Overdue</div><div className="big">{view.totals.overdue}</div></div>
        <div className="card"><div className="muted">Paid</div><div className="big">{view.totals.paid}</div></div>
        <div className="card"><div className="muted">Not invoiced yet</div><div className="big">{view.totals.notInvoiced}</div></div>
      </div>

      <div className="card">
        <h2>Needs attention</h2>
        {view.attention.length === 0 ? (
          <p className="muted">Nothing needs you right now.</p>
        ) : (
          <ul>
            {view.attention.map((item) => (
              <li key={item.dealId}>
                <Link href={`/deals/${item.dealId}`}>{item.message}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>All deals</h2>
        {view.rows.length === 0 ? (
          <p className="muted">
            No deals yet. <Link href="/deals/new">Paste your first brand email</Link>.
          </p>
        ) : (
          <table>
            <thead>
              <tr><th>Brand</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <tr key={row.id}>
                  <td><Link href={`/deals/${row.id}`}>{row.brandName}</Link></td>
                  <td>{row.amount}</td>
                  <td><span className={`badge badge-${row.status}`}>{row.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}