import type { LlmCall } from "./extractDeal";

// The one part of the Anthropic SDK client we use. Tests pass a fake with the same shape.
export type MessagesApi = {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: "user"; content: string }>;
    }): Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
};

export function createClaudeLlm(client: MessagesApi, model: string): LlmCall {
  return async ({ system, user }) => {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = response.content
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("");
    if (!text) throw new Error("Claude returned no text");
    return text;
  };
}