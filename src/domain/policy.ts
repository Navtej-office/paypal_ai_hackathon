import type { DealStatus } from "./deal";

export type ReminderLimits = { maxReminders: number; minGapDays: number };

export type InvoiceForReminder = {
  dueAt: Date;
  status: DealStatus;
  reminders: Date[]; // when previous reminders were sent
};

export type ReminderDecision =
  | { ok: true }
  | { ok: false; reason: "ALREADY_PAID" | "NOT_DUE" | "MAX_REACHED" | "TOO_SOON" };

const DAY_MS = 24 * 60 * 60 * 1000;

export function canSendReminder(
  invoice: InvoiceForReminder,
  limits: ReminderLimits,
  now: Date,
): ReminderDecision {
  if (invoice.status === "paid") return { ok: false, reason: "ALREADY_PAID" };
  if (now <= invoice.dueAt) return { ok: false, reason: "NOT_DUE" };
  if (invoice.reminders.length >= limits.maxReminders) return { ok: false, reason: "MAX_REACHED" };

  const last = invoice.reminders.reduce<Date | null>((a, b) => (!a || b > a ? b : a), null);
  if (last && now.getTime() - last.getTime() < limits.minGapDays * DAY_MS) {
    return { ok: false, reason: "TOO_SOON" };
  }
  return { ok: true };
}