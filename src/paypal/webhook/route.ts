import { NextResponse } from "next/server";
import { getServices } from "../../lib/services";
import { handlePayPalEvent } from "../../usecases/handlePayPalEvent";

export const dynamic = "force-dynamic";

// PayPal calls this URL when something happens to an invoice (for example, it gets paid).
// Status codes matter: 2xx tells PayPal "got it", anything else makes PayPal retry later.
export async function POST(request: Request) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("PAYPAL_WEBHOOK_ID is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: unknown;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ error: "Body is not JSON" }, { status: 400 });
  }

  const { store, paypal } = getServices();
  const headers = Object.fromEntries(request.headers); // header names arrive lowercase

  try {
    const genuine = await paypal.verifyWebhookSignature({ headers, event, webhookId });
    if (!genuine) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

    const result = await handlePayPalEvent(event as Parameters<typeof handlePayPalEvent>[0], { store }, new Date());
    console.log(`PayPal webhook ${(event as { id?: string }).id}: ${result}`);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("PayPal webhook failed:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 }); // PayPal will retry
  }
}