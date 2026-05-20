import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",

  transpilePackages: ["@abacusflow/core", "@abacusflow/ui", "@abacusflow/utils", "@abacusflow/config"],

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
