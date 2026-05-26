import type { NextConfig } from "next";

const apiProxyTarget = "http://localhost:8080".replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),

  transpilePackages: [
    "@abacusflow/core",
    "@abacusflow/ui-web",
    "@abacusflow/utils",
    "@abacusflow/config",
  ],

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "react-native$": "react-native-web",
    };
    config.resolve.extensions = [
      ".web.tsx",
      ".web.ts",
      ".web.jsx",
      ".web.js",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
    ];
    return config;
  },
};

export default nextConfig;
