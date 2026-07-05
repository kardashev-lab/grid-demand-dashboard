import type { NextConfig } from "next";
import path from "path";

const config: NextConfig = {
  output: "standalone",
  // Pin explicitly: this app lives nested under services/dashboard, and Next's root
  // inference can pick the wrong directory (e.g. a lockfile elsewhere on the machine),
  // which puts .next/standalone/server.js at the wrong path.
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ["react-simple-maps"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default config;
