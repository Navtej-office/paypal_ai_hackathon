import { describe, it, expect, vi } from "vitest";

import type { DealRecord } from "../store/dealRows";
import { CreateDealDeps, createDealFromEmail } from "./createDealFromEmai";

const email = "Hi Priya, $500 for a YouTube video, net 30. Sam (sam@acme.example.com)";

const aiReply = JSON.stringify({
  brandName: "Acme Gadgets",
  brandEmail: "sam@acme.example.com",
  deliverables: [{ platform: "youtube", type: "video" }],
  amount: 500,
  currency: "USD",
  termDays: 30,
});

const savedDeal = { id: "deal-1", brandName: "Acme Gadgets", amountCents: 50000, status: "draft" } as DealRecord;

function fakeDeps(reply: string = aiReply) {
  return {
    llm: vi.fn().mockResolvedValue(reply),
    store: {
      createDeal: vi.fn().mockResolvedValue(savedDeal),
      logAudit: vi.fn().mockResolvedValue(undefined),
    },
  } satisfies CreateDealDeps;
}

describe("createDealFromEmail", () => {
  it("extracts the deal with the AI and saves it", async () => {
    const deps = fakeDeps();
    const result = await createDealFromEmail(email, deps);

    expect(result).toEqual({ ok: true, deal: savedDeal });
    const [extracted, source] = deps.store.createDeal.mock.calls[0];
    expect(extracted.amountCents).toBe(50000);
    expect(source).toBe(email);
  });

  it("records the extraction in the audit log as done by the AI", async () => {
    const deps = fakeDeps();
    await createDealFromEmail(email, deps);

    expect(deps.store.logAudit).toHaveBeenCalledWith("deal-1", "ai", "deal_extracted", {
      brandName: "Acme Gadgets",
      amountCents: 50000,
    });
  });

  it("returns a friendly error and saves nothing when the email has no price", async () => {
    const deps = fakeDeps(JSON.stringify({ missing: ["amount"] }));
    const result = await createDealFromEmail("Want to collab?", deps);

    expect(result).toEqual({ ok: false, error: "The email is missing: amount" });
    expect(deps.store.createDeal).not.toHaveBeenCalled();
  });

  it("returns an error for an empty email without calling the AI", async () => {
    const deps = fakeDeps();
    const result = await createDealFromEmail("  ", deps);

    expect(result).toEqual({ ok: false, error: "Email text is empty" });
    expect(deps.llm).not.toHaveBeenCalled();
  });

  it("returns an error if saving fails", async () => {
    const deps = fakeDeps();
    deps.store.createDeal.mockRejectedValue(new Error("Save deal failed: network"));
    const result = await createDealFromEmail(email, deps);

    expect(result).toEqual({ ok: false, error: "Save deal failed: network" });
  });
});