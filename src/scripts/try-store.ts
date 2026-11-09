// Extracts a deal with Claude, saves it to Supabase, marks it live, and reads it back.
//   npm run try-store
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabase } from "../store/supabase";
import { createClaudeLlm } from "../ai/claude";
import { extractDeal } from "../ai/extractDeal";
import { createDealStore } from "../store/dealStore";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

const email = `Hi Priya,
We're Acme Gadgets and we'd love a dedicated YouTube video reviewing our new Acme Buds Pro.
Our budget is $500, paid net 30 after the video goes live. Ideally published by 2026-11-20.
Best, Sam Lee, Partnerships (partnerships@acmegadgets.com)`;

async function main() {
const db = createServerSupabase(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"));
  const store = createDealStore(db);
  const llm = createClaudeLlm(new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") }), process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5");

  console.log("1. Extracting deal with Claude...");
  const extracted = await extractDeal(email, llm);

  console.log("2. Saving to Supabase...");
  const saved = await store.createDeal(extracted, email);
  await store.logAudit(saved.id, "ai", "deal_extracted", { amountCents: saved.amountCents });
  console.log(`   Saved deal ${saved.id} (${saved.brandName}, ${saved.status})`);

  console.log("3. Marking the post live...");
  const live = await store.markLive(saved.id, "https://youtube.com/watch?v=dQw4w9WgXcQ", new Date());
  await store.logAudit(live.id, "creator", "marked_live", { proofUrl: live.proofUrl });
  console.log(`   Status: ${live.status}, proof: ${live.proofUrl}`);

  console.log("4. Reading all deals back...");
  const deals = await store.listDeals();
  for (const d of deals) console.log(`   - ${d.brandName}: $${d.amountCents / 100} [${d.status}]`);

  console.log("\nDone. Open Supabase -> Table Editor -> deals and audit_log to see the rows.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});