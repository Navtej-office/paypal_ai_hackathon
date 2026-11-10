import { getServices } from "../lib/services";

export const dynamic = "force-dynamic"; // always load fresh data

export default async function DashboardPage() {
  let count: number | null = null;
  let error: string | null = null;
  try {
    count = (await getServices().store.listDeals()).length;
  } catch (err) {
    error = (err as Error).message;
  }

  return (
    <div className="card">
      <h1>Dashboard</h1>
      {error ? (
        <p className="error">Could not load deals: {error}</p>
      ) : (
        <p>You have {count} deal{count === 1 ? "" : "s"} saved.</p>
      )}
    </div>
  );
}