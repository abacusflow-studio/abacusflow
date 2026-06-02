import appVersion from "../../../app-version.json";

export const DEFAULT_APP_VERSION = appVersion.version;

type RuntimeEnv = Record<string, string | undefined>;

function getRuntimeEnv(): RuntimeEnv {
  return (globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {};
}

export function resolveAppVersion(version?: string): string {
  const env = getRuntimeEnv();

  return (
    version ??
    env.EXPO_PUBLIC_APP_VERSION ??
    env.NEXT_PUBLIC_APP_VERSION ??
    env.APP_VERSION ??
    DEFAULT_APP_VERSION
  );
}
