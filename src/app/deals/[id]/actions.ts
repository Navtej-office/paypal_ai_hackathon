"use server";

import { revalidatePath } from "next/cache";
import { getServices } from "../../../lib/services";
import { markDealLive, sendInvoiceForDeal } from "../../../usecases/dealActions";
  import { checkPayment } from "../../../usecases/checkPayment";

  export type FormState = { error?: string; message?: string };

export async function markLiveAction(dealId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { store } = getServices();
  const result = await markDealLive(dealId, String(formData.get("proofUrl") ?? ""), { store }, new Date());
  if (!result.ok) return { error: result.error };
  revalidatePath(`/deals/${dealId}`);
  return {};
}

export async function sendInvoiceAction(dealId: string, _prev: FormState, _formData: FormData): Promise<FormState> {
  const { store, paypal, invoicerEmail } = getServices();
  const result = await sendInvoiceForDeal(dealId, { store, paypal, invoicerEmail }, new Date());
  if (!result.ok) return { error: result.error };
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/");
  return {};
}

  export async function checkPaymentAction(dealId: string, _prev: FormState, _formData: FormData): Promise<FormState> {
    const { store, paypal } = getServices();
    const result = await checkPayment(dealId, { store, paypal }, new Date());
    if (!result.ok) return { error: result.error };
    if (!result.paid) return { message: `Not paid yet. PayPal says: ${result.paypalStatus}` };
    revalidatePath(`/deals/${dealId}`);
    revalidatePath("/");
    return {};
  }