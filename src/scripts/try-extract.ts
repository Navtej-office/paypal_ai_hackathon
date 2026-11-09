// Runs the deal extractor on sample brand emails using the real Claude API.
//   npm run extract
import Anthropic from "@anthropic-ai/sdk";
import { createClaudeLlm } from "../ai/claude";
import { extractDeal } from "../ai/extractDeal";

const samples: Record<string, string> = {
  clear: `Hi Priya,
We're Acme Gadgets and we'd love a dedicated YouTube video (8-10 min) reviewing our new Acme Buds Pro.
Our budget is $500, paid net 30 after the video goes live. Ideally published by 2026-11-20.
Best, Sam Lee, Partnerships (partnerships@acmegadgets.com)`,

  messy: `hey!! loved ur last reel 🔥 we're BrightNote (notes app). thinking 1 insta reel + 3 stories,
can do 750 USD for the lot. we usually pay within 15 days of posting.
reach me at maya@brightnote.app - maya`,

  missingPrice: `Hello! We're FitFuel and would like to collaborate on a sponsored Instagram reel.
Let us know your rates and availability. Cheers, Raj (raj@fitfuel.co)`,
};

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY in .env.local");
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5";

  const llm = createClaudeLlm(new Anthropic({ apiKey }), model);

  for (const [name, email] of Object.entries(samples)) {
    console.log(`\n=== ${name} ===`);
    try {
      const deal = await extractDeal(email, llm);
      console.log(JSON.stringify(deal, null, 2));
    } catch (err) {
      console.log(`Rejected: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});