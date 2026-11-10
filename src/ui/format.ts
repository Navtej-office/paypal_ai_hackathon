import { formatUsd } from "../domain/money";
import type { Deal } from "../domain/types";

const DAY_MS = 24 * 60 * 60 * 1000;

// 125050 -> "$1,250.50"
export function formatMoney(cents: number): string {
  const [whole, fraction] = formatUsd(cents).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${grouped}.${fraction}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// A short status line for a deal, e.g. "Due in 5 days" or "3 days overdue".
export function dueLabel(deal: Deal, now: Date): string {
  if (deal.status === "paid") return "Paid";
  if (deal.status === "draft") return "Not live yet";
  if (deal.status === "live" || !deal.invoice) return "Live, not invoiced";

  const msLeft = deal.invoice.dueAt.getTime() - now.getTime();
  if (msLeft < 0) {
    const daysLate = Math.floor(-msLeft / DAY_MS);
    return daysLate === 0 ? "Overdue" : `${plural(daysLate, "day")} overdue`;
  }
  const daysLeft = Math.ceil(msLeft / DAY_MS);
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  return `Due in ${daysLeft} days`;
}