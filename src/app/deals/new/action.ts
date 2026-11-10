"use server";

import { redirect } from "next/navigation";
import { createDealFromEmail } from "../../../usecases/createDealFromEmai";
import { getServices } from "../../../lib/services";


export type NewDealState = { error?: string; email?: string };

export async function createDealAction(_prev: NewDealState, formData: FormData): Promise<NewDealState> {
  const email = String(formData.get("email") ?? "");
  const { llm, store } = getServices();

  const result = await createDealFromEmail(email, { llm, store });
  if (!result.ok) return { error: result.error, email };

  redirect(`/deals/${result.deal.id}`); // must be outside try/catch: redirect works by throwing
}