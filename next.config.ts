import type { NextConfig } from "next";

// The storage hostname is derived from SUPABASE_URL at build time. This value is
// only consumed by the server-side image optimizer, so it never lands in a client
// bundle. The wildcard fallback keeps `next build` working if the env var is absent
// (e.g. a lint-only CI run).
function storageHostname(): string {
  try {
    return new URL(process.env.SUPABASE_URL!).hostname;
  } catch {
    return "*.supabase.co";
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: storageHostname(),
        pathname: "/storage/v1/**",
        // `search` is intentionally left unset: card variants are requested with
        // Supabase's `?width=…&quality=…` transformation query string.
      },
    ],
  },
};

export default nextConfig;
