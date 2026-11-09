// Sends a real invoice to the PayPal sandbox, or checks one.
//   Send:  npm run sandbox
//   Check: npm run sandbox -- INV2-XXXX-XXXX-XXXX-XXXX

import { createPayPalClient } from "../src/paypal/client";
import { buildInvoice } from "../src/paypal/payload";
import { createTokenProvider } from "../src/paypal/token";


function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

async function main() {
  const baseUrl = requireEnv("PAYPAL_API_BASE");
  const getToken = createTokenProvider({
    baseUrl,
    clientId: requireEnv("PAYPAL_CLIENT_ID"),
    clientSecret: requireEnv("PAYPAL_CLIENT_SECRET"),
  });
  const client = createPayPalClient({ baseUrl, getToken });

  const existingId = process.argv[2];
  if (existingId) {
    const info = await client.getInvoice(existingId);
    console.log(`Invoice ${info.id}: ${info.status}${info.paid ? " (paid)" : ""}`);
    return;
  }

  const payload = buildInvoice({
    invoicerEmail: requireEnv("PAYPAL_INVOICER_EMAIL"),
    brandEmail: requireEnv("PAYPAL_PAYER_EMAIL"),
    brandName: "Acme Gadgets",
    description: "Sponsored YouTube video",
    amountCents: 35000,
    termDays: 30,
    proofUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
  });

  console.log("Creating and sending invoice...");
  const { id } = await client.createAndSendInvoice(payload);
  const info = await client.getInvoice(id);

  console.log(`Invoice ${info.id}: ${info.status}`);
  console.log(`Pay it as the brand: ${info.payUrl ?? "(no link returned, open the invoice in the sandbox dashboard)"}`);
  console.log(`Then check it:       npm run sandbox -- ${info.id}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  if (err instanceof Error && err.cause) console.error("Cause:", err.cause);
  process.exit(1);
});