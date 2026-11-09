import { describe, it, expect, vi } from "vitest";
import { createClaudeLlm, MessagesApi } from "./claude";


const reply = (...blocks: Array<{ type: string; text?: string }>) => ({ content: blocks });

describe("createClaudeLlm", () => {
  it("sends the system prompt and email to the chosen model", async () => {
    const create = vi.fn().mockResolvedValue(reply({ type: "text", text: "{}" }));
    const llm = createClaudeLlm({ messages: { create } } as MessagesApi, "claude-haiku-5-5");

    await llm({ system: "You extract deals.", user: "Brand email: ..." });

    expect(create).toHaveBeenCalledWith({
      model: "claude-haiku-5-5",
      max_tokens: 1024,
      system: "You extract deals.",
      messages: [{ role: "user", content: "Brand email: ..." }],
    });
  });

  it("returns the text of the reply", async () => {
    const create = vi.fn().mockResolvedValue(reply({ type: "text", text: '{"amount": 500}' }));
    const llm = createClaudeLlm({ messages: { create } } as MessagesApi, "claude-haiku-5-5");

    expect(await llm({ system: "s", user: "u" })).toBe('{"amount": 500}');
  });

  it("ignores non-text blocks such as thinking", async () => {
    const create = vi.fn().mockResolvedValue(reply({ type: "thinking" }, { type: "text", text: "{}" }));
    const llm = createClaudeLlm({ messages: { create } } as MessagesApi, "claude-haiku-5-5");

    expect(await llm({ system: "s", user: "u" })).toBe("{}");
  });

  it("throws when the reply has no text", async () => {
    const create = vi.fn().mockResolvedValue(reply({ type: "thinking" }));
    const llm = createClaudeLlm({ messages: { create } } as MessagesApi, "claude-haiku-5-5");

    await expect(llm({ system: "s", user: "u" })).rejects.toThrow("Claude returned no text");
  });
});