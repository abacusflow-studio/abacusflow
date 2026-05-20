import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",

  // transpile packages that are not transpiled by default
  transpilePackages: ["react-native", "@abacusflow/ui"],

  // TODO: build-turbopack fail
  // turbopack: {
  //   resolveAlias: {
  //     // Transform all direct `react-native` imports to `react-native-web`
  //     "react-native": "react-native-web",
  //   },
  //   resolveExtensions: [".web.js", ".web.jsx", ".web.ts", ".web.tsx"],
  // },

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
