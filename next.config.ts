import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  poweredByHeader: false,
};

export default nextConfig;

// Enables Cloudflare bindings during `next dev`. Guarded so it does not run
// during production builds (incl. `opennextjs-cloudflare build`), which keeps
// the build Windows-compatible.
if (process.env.NODE_ENV !== "production") {
  import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
}
