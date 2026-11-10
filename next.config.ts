import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep these as normal Node packages instead of bundling them.
  serverExternalPackages: ["ws", "@supabase/supabase-js"],
};

export default nextConfig;