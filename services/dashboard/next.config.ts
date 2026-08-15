import type { NextConfig } from "next";

const config: NextConfig = {

  // Vercel Root Directory is services/dashboard, so cwd is this app. Pinning
  // __dirname as outputFileTracingRoot made Next look for .next at the repo root.
  transpilePackages: ["react-simple-maps", "kardashev-charts"],
  turbopack: {
    root: process.cwd(),
  },
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
