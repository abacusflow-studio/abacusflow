import { defineAppConfig, setAppConfig } from "@abacusflow/config";

declare global {
  interface Window {
    __ENV__?: Partial<Record<string, string>>;
  }
}

// 优先读运行时注入的 window.__ENV__（Docker 启动时由 custom-entrypoint.sh 生成），
// 回退到 build-time 烤入的 process.env.NEXT_PUBLIC_*（本地开发用）
function runtimeEnv(
  key: string,
  buildTimeValue: string | undefined,
): string | undefined {
  if (typeof window !== "undefined") {
    return window.__ENV__?.[key] || buildTimeValue;
  }
  return buildTimeValue;
}

const isBrowser = typeof window !== "undefined";

export const appConfig = defineAppConfig(
  {
    apiBaseUrl: runtimeEnv("NEXT_PUBLIC_API_BASE_URL", process.env.NEXT_PUBLIC_API_BASE_URL),
    auth0: {
      domain: runtimeEnv("NEXT_PUBLIC_AUTH0_DOMAIN", process.env.NEXT_PUBLIC_AUTH0_DOMAIN),
      clientId: runtimeEnv("NEXT_PUBLIC_AUTH0_CLIENT_ID", process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID),
      audience: runtimeEnv("NEXT_PUBLIC_AUTH0_AUDIENCE", process.env.NEXT_PUBLIC_AUTH0_AUDIENCE),
      redirectUri: runtimeEnv("NEXT_PUBLIC_AUTH0_REDIRECT_URI", process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI),
    },
    cubeEndpoint: runtimeEnv("NEXT_PUBLIC_CUBE_ENDPOINT", process.env.NEXT_PUBLIC_CUBE_ENDPOINT),
    cubeToken: runtimeEnv("NEXT_PUBLIC_CUBE_TOKEN", process.env.NEXT_PUBLIC_CUBE_TOKEN),
    version: process.env.NEXT_PUBLIC_APP_VERSION,
  },
  { requireAuth0: isBrowser }, // build 时跳过校验，浏览器运行时才校验
);

setAppConfig(appConfig);
