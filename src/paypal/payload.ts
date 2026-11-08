import { formatUsd } from "../domain/money";

export type InvoiceInput = {
  invoicerEmail: string;
  brandEmail: string;
  brandName: string;
  description: string;
  amountCents: number;
  termDays: number;
  proofUrl: string;
};

const TERMS: Record<number, string> = {
  0: "DUE_ON_RECEIPT",
  10: "NET_10",
  15: "NET_15",
  30: "NET_30",
  45: "NET_45",
  60: "NET_60",
  90: "NET_90",
};

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function buildInvoice(input: InvoiceInput) {
  const termType = TERMS[input.termDays];
  if (!termType) throw new Error(`Unsupported payment term: ${input.termDays} days`);
  if (!isHttpsUrl(input.proofUrl)) throw new Error(`Invalid proof URL: ${input.proofUrl}`);

  return {
    detail: {
      currency_code: "USD",
      note: `Thanks for the collaboration, ${input.brandName}! The sponsored content is live: ${input.proofUrl}`,
      payment_term: { term_type: termType },
    },
    invoicer: { email_address: input.invoicerEmail },
    primary_recipients: [{ billing_info: { email_address: input.brandEmail } }],
    items: [
      {
        name: input.description,
        quantity: "1",
        unit_amount: { currency_code: "USD", value: formatUsd(input.amountCents) },
      },
    ],
  };
}