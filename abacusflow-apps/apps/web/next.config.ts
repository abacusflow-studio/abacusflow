import type { NextConfig } from "next";
import appVersion from "../../app-version.json";

const apiProxyTarget = (
  process.env.API_PROXY_TARGET ?? "http://localhost:8080"
).replace(/\/$/, "");
const productVersion =
  process.env.NEXT_PUBLIC_APP_VERSION ??
  process.env.APP_VERSION ??
  appVersion.version;

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "production" ? { output: "export" } : {}),
  env: {
    NEXT_PUBLIC_APP_VERSION: productVersion,
  },

  transpilePackages: [
    "@abacusflow/core",
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
