import { describe, it, expect, vi } from "vitest";
import { extractDeal, LlmCall } from "./extractDeal";


const email = `Hi Priya, we'd love a dedicated YouTube video about our Acme Earbuds.
Budget is $500, paid net 30 after the video goes live. Please publish by Nov 20.
Thanks, Sam (partnerships@acme.example.com)`;

const goodReply = JSON.stringify({
  brandName: "Acme Gadgets",
  brandEmail: "partnerships@acme.example.com",
  deliverables: [{ platform: "youtube", type: "dedicated video" }],
  amount: 500,
  currency: "USD",
  termDays: 30,
  deadline: "2026-11-20",
});

describe("extractDeal", () => {
  it("sends the brand email to the AI with instructions", async () => {
    const llm = vi.fn<LlmCall>().mockResolvedValue(goodReply);
    await extractDeal(email, llm);

    const { system, user } = llm.mock.calls[0][0];
    expect(user).toContain("Acme Earbuds");
    expect(system).toContain("JSON");
  });

  it("returns the deal from the AI's JSON reply", async () => {
    const llm = vi.fn<LlmCall>().mockResolvedValue(goodReply);
    const deal = await extractDeal(email, llm);

    expect(deal.brandName).toBe("Acme Gadgets");
    expect(deal.amountCents).toBe(50000);
    expect(deal.termDays).toBe(30);
  });

  it("handles a reply wrapped in a markdown code block", async () => {
    const llm = vi.fn<LlmCall>().mockResolvedValue("```json\n" + goodReply + "\n```");
    expect((await extractDeal(email, llm)).amountCents).toBe(50000);
  });

  it("retries once and tells the AI what was wrong", async () => {
    const bad = JSON.stringify({ ...JSON.parse(goodReply), currency: "EUR" });
    const llm = vi.fn<LlmCall>().mockResolvedValueOnce(bad).mockResolvedValueOnce(goodReply);

    const deal = await extractDeal(email, llm);

    expect(deal.amountCents).toBe(50000);
    expect(llm).toHaveBeenCalledTimes(2);
    expect(llm.mock.calls[1][0].user).toContain("currency");
  });

  it("retries when the reply isn't JSON at all", async () => {
    const llm = vi.fn<LlmCall>().mockResolvedValueOnce("Sure! Here is the deal...").mockResolvedValueOnce(goodReply);
    expect((await extractDeal(email, llm)).amountCents).toBe(50000);
  });

  it("gives up after a second bad reply", async () => {
    const llm = vi.fn<LlmCall>().mockResolvedValue("not json");
    await expect(extractDeal(email, llm)).rejects.toThrow("Could not extract a deal");
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it("reports what the email is missing instead of guessing", async () => {
    const llm = vi.fn<LlmCall>().mockResolvedValue(JSON.stringify({ missing: ["amount"] }));
    await expect(extractDeal("Hi, want to collab on a reel?", llm)).rejects.toThrow("The email is missing: amount");
    expect(llm).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty email without calling the AI", async () => {
    const llm = vi.fn<LlmCall>();
    await expect(extractDeal("   ", llm)).rejects.toThrow("Email text is empty");
    expect(llm).not.toHaveBeenCalled();
  });
});