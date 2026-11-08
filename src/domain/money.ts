const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function toCents(amount: string): number {
  if (!AMOUNT_PATTERN.test(amount)) throw new Error(`Invalid amount: ${amount}`);
  const [whole, fraction = ""] = amount.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents <= 0) throw new Error(`Invalid amount: ${amount}`);
  return cents;
}

export function formatUsd(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error(`Invalid cents: ${cents}`);
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}