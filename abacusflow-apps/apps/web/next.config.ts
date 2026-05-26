import type { NextConfig } from "next";

const apiProxyTarget = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"
).replace(/\/$/, "");

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
    // Handle .js imports resolving to .ts files (TypeScript nodenext module resolution)
    config.resolve.plugins = config.resolve.plugins ?? [];
    config.resolve.plugins.push({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apply(resolver: any) {
        const target = resolver.ensureHook("resolve");
        resolver.getHook("described-resolve").tapAsync(
          "JsToTsPlugin",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (request: any, resolveContext: any, callback: any) => {
            const req = request.request as string | undefined;
            if (req && req.endsWith(".js")) {
              const tsReq = req.slice(0, -3) + ".ts";
              const tsxReq = req.slice(0, -3) + ".tsx";
              const newRequest = { ...request, request: tsReq };
              resolver.doResolve(
                target,
                newRequest,
                `try .js -> .ts: ${tsReq}`,
                resolveContext,
                (err: Error | null, result: unknown) => {
                  if (err) return callback(err);
                  if (result) return callback(null, result);
                  const newRequestTsx = { ...request, request: tsxReq };
                  resolver.doResolve(
                    target,
                    newRequestTsx,
                    `try .js -> .tsx: ${tsxReq}`,
                    resolveContext,
                    callback,
                  );
                },
              );
            } else {
              callback();
            }
          },
        );
      },
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    return config;
  },
};

export default nextConfig;
