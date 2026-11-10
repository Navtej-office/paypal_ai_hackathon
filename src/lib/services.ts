import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createServerSupabase } from "../store/supabase";
import { createDealStore } from "../store/dealStore";
import { createClaudeLlm } from "../ai/claude";
import { createTokenProvider } from "../paypal/token";
import { createPayPalClient } from "../paypal/client";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

// Built once per server process and reused by every page and route.
let services: ReturnType<typeof build> | undefined;

function build() {
  const store = createDealStore(
    createServerSupabase(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY")),
  );
  const llm = createClaudeLlm(
    new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") }),
    process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5",
  );
  const baseUrl = requireEnv("PAYPAL_API_BASE");
  const paypal = createPayPalClient({
    baseUrl,
    getToken: createTokenProvider({
      baseUrl,
      clientId: requireEnv("PAYPAL_CLIENT_ID"),
      clientSecret: requireEnv("PAYPAL_CLIENT_SECRET"),
    }),
  });
  return { store, llm, paypal, invoicerEmail: requireEnv("PAYPAL_INVOICER_EMAIL") };
}

export function getServices() {
  services ??= build();
  return services;
}