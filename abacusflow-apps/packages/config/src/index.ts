import { DEFAULT_APP_VERSION, resolveAppVersion } from "./version";
export * from "./version";

export interface Auth0Config {
  domain: string;
  clientId: string;
  audience: string;
  redirectUri?: string;
}

export interface AppConfig {
  apiBaseUrl: string;
  auth0: Auth0Config;
  cubeEndpoint: string;
  version: string;
}

export interface AppConfigInput {
  apiBaseUrl?: string;
  auth0?: {
    domain?: string;
    clientId?: string;
    audience?: string;
    redirectUri?: string;
  };
  cubeEndpoint?: string;
  version?: string;
}

export interface DefineAppConfigOptions {
  requireAuth0?: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  apiBaseUrl: "/api",
  auth0: {
    domain: "",
    clientId: "",
    audience: "https://admin.abacusflow.cn",
  },
  cubeEndpoint: "/cubejs-api",
  version: DEFAULT_APP_VERSION,
};

let appConfig: AppConfig = DEFAULT_CONFIG;

export function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function defineAppConfig(
  input: AppConfigInput,
  options: DefineAppConfigOptions = {},
): AppConfig {
  const auth0Domain = options.requireAuth0
    ? required(input.auth0?.domain, "NEXT_PUBLIC_AUTH0_DOMAIN")
    : (input.auth0?.domain ?? DEFAULT_CONFIG.auth0.domain);
  const auth0ClientId = options.requireAuth0
    ? required(input.auth0?.clientId, "NEXT_PUBLIC_AUTH0_CLIENT_ID")
    : (input.auth0?.clientId ?? DEFAULT_CONFIG.auth0.clientId);

  return {
    apiBaseUrl: input.apiBaseUrl ?? DEFAULT_CONFIG.apiBaseUrl,
    auth0: {
      domain: auth0Domain,
      clientId: auth0ClientId,
      audience: input.auth0?.audience ?? DEFAULT_CONFIG.auth0.audience,
      redirectUri: input.auth0?.redirectUri,
    },
    cubeEndpoint: input.cubeEndpoint ?? DEFAULT_CONFIG.cubeEndpoint,
    version: resolveAppVersion(input.version),
  };
}

export function setAppConfig(config: AppConfig): void {
  appConfig = config;
}

export function getConfig(): AppConfig {
  return appConfig;
}

export function getCurrentVersion(): string {
  return getConfig().version;
}

/** Default fallback only; use getCurrentVersion() for runtime app version. */
export const CURRENT_VERSION = DEFAULT_CONFIG.version;

export interface VersionAnnouncement {
  version: string;
  date: string;
  content: string[];
}
