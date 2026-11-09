import { parseDeal, SUPPORTED_TERM_DAYS, type ExtractedDeal } from "./dealSchema";

// Any function that sends a system + user message to an AI and returns its text reply.
export type LlmCall = (input: { system: string; user: string }) => Promise<string>;

const SYSTEM_PROMPT = `You extract sponsored-content deal terms from emails that brands send to creators.
Reply with ONLY a JSON object, no other text, in this shape:
{
  "brandName": string,
  "brandEmail": string,
  "deliverables": [{ "platform": "youtube" | "instagram" | "x" | "linkedin" | "podcast" | "other", "type": string }],
  "amount": number,          // total price in USD, e.g. 500 or 349.99
  "currency": "USD",
  "termDays": number,        // one of ${SUPPORTED_TERM_DAYS.join(", ")}; use 30 if not stated
  "deadline": "YYYY-MM-DD"   // omit if not stated
}
Only use information stated in the email. Never guess the amount or the brand's email address.
If the amount or brand email is not in the email, reply with {"missing": ["amount", ...]} instead.`;

function parseJson(reply: string): unknown {
  const cleaned = reply.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

function tryParse(reply: string): { deal?: ExtractedDeal; missing?: string[]; error?: string } {
  let data: unknown;
  try {
    data = parseJson(reply);
  } catch {
    return { error: "Your reply was not valid JSON." };
  }
  if (data && typeof data === "object" && Array.isArray((data as { missing?: unknown }).missing)) {
    return { missing: (data as { missing: string[] }).missing };
  }
  try {
    return { deal: parseDeal(data) };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function extractDeal(emailText: string, llm: LlmCall): Promise<ExtractedDeal> {
  if (!emailText.trim()) throw new Error("Email text is empty");

  const user = `Brand email:\n"""\n${emailText.trim()}\n"""`;
  const first = tryParse(await llm({ system: SYSTEM_PROMPT, user }));
  if (first.missing) throw new Error(`The email is missing: ${first.missing.join(", ")}`);
  if (first.deal) return first.deal;

  // One retry, telling the AI exactly what was wrong.
  const retryUser = `${user}\n\nYour previous reply was rejected: ${first.error}\nReply again with only the corrected JSON.`;
  const second = tryParse(await llm({ system: SYSTEM_PROMPT, user: retryUser }));
  if (second.missing) throw new Error(`The email is missing: ${second.missing.join(", ")}`);
  if (second.deal) return second.deal;

  throw new Error(`Could not extract a deal from this email: ${second.error}`);
}