import { describe, it, expect } from "vitest";
import { canSendReminder, type ReminderLimits } from "./policy";

const limits: ReminderLimits = { maxReminders: 3, minGapDays: 3 };
const day = (d: number) => new Date(Date.UTC(2026, 10, d)); // November 2026

describe("canSendReminder", () => {
  it("blocks reminders before the invoice is due", () => {
    const result = canSendReminder({ dueAt: day(20), status: "invoiced", reminders: [] }, limits, day(15));
    expect(result).toEqual({ ok: false, reason: "NOT_DUE" });
  });

  it("allows the first reminder once the invoice is overdue", () => {
    const result = canSendReminder({ dueAt: day(10), status: "invoiced", reminders: [] }, limits, day(11));
    expect(result).toEqual({ ok: true });
  });

  it("blocks a reminder sent too soon after the last one", () => {
    const result = canSendReminder({ dueAt: day(1), status: "invoiced", reminders: [day(10)] }, limits, day(12));
    expect(result).toEqual({ ok: false, reason: "TOO_SOON" });
  });

  it("allows a reminder once the gap has passed", () => {
    const result = canSendReminder({ dueAt: day(1), status: "invoiced", reminders: [day(10)] }, limits, day(13));
    expect(result).toEqual({ ok: true });
  });

  it("blocks reminders after the maximum is reached", () => {
    const result = canSendReminder(
      { dueAt: day(1), status: "invoiced", reminders: [day(2), day(5), day(8)] },
      limits,
      day(20),
    );
    expect(result).toEqual({ ok: false, reason: "MAX_REACHED" });
  });

  it("never reminds about a paid invoice", () => {
    const result = canSendReminder({ dueAt: day(1), status: "paid", reminders: [] }, limits, day(20));
    expect(result).toEqual({ ok: false, reason: "ALREADY_PAID" });
  });
});