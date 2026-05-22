import type { NextConfig } from "next";

const apiProxyTarget = (process.env.ABACUSFLOW_API_PROXY_TARGET ?? "http://localhost:8080").replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),

  transpilePackages: ["@abacusflow/core", "@abacusflow/ui", "@abacusflow/utils", "@abacusflow/config"],

  ...(process.env.NODE_ENV === "development"
    ? {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: `${apiProxyTarget}/:path*`,
            },
          ];
        },
      }
    : {}),

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-native$": "react-native-web",
    };
    config.resolve.extensions = [
      ".web.js",
      ".web.jsx",
      ".web.ts",
      ".web.tsx",
      ...config.resolve.extensions,
    ];
    return config;
  },
};

export default nextConfig;
