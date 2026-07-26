import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// `rewrites` is incompatible with `output: 'export'` — dev uses the proxy to
// the FastAPI backend, production build emits a static export served by FastAPI.
const nextConfig: NextConfig = {
  ...(isDev
    ? {
        async rewrites() {
          return [{ source: "/api/:path*", destination: "http://localhost:8000/api/:path*" }];
        },
      }
    : { output: "export" as const }),
};

export default nextConfig;
