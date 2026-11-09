import { createClient } from "@supabase/supabase-js";
import ws from "ws";

type Transport = NonNullable<NonNullable<Parameters<typeof createClient>[2]>["realtime"]>["transport"];

// Server-side Supabase client. Passing "ws" lets it run on Node 20, which has no built-in WebSocket.
export function createServerSupabase(url: string, secretKey: string) {
  return createClient(url, secretKey, {
    auth: { persistSession: false },
    realtime: { transport: ws as unknown as Transport },
  });
}