import { defineAppConfig, setAppConfig } from "@abacusflow/config";

export const MOBILE_AUTH_SCHEME = "abacusflow";
export const MOBILE_AUTH_CALLBACK_PATH = "oauth/callback";

export const appConfig = defineAppConfig({
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  auth0: {
    domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN,
    clientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
    audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE,
    redirectUri: process.env.EXPO_PUBLIC_AUTH0_REDIRECT_URI,
  },
  version: process.env.EXPO_PUBLIC_APP_VERSION,
});

setAppConfig(appConfig);

export const mobileConfigIssues = [
  !process.env.EXPO_PUBLIC_API_BASE_URL && "EXPO_PUBLIC_API_BASE_URL",
  !process.env.EXPO_PUBLIC_AUTH0_DOMAIN && "EXPO_PUBLIC_AUTH0_DOMAIN",
  !process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID && "EXPO_PUBLIC_AUTH0_CLIENT_ID",
  !process.env.EXPO_PUBLIC_AUTH0_AUDIENCE && "EXPO_PUBLIC_AUTH0_AUDIENCE",
].filter(Boolean) as string[];

export function apiUrl(path: string): string {
  return `${appConfig.apiBaseUrl.replace(/\/+$/, "")}${path}`;
}

export function getAuth0Issuer(): string {
  const raw = appConfig.auth0.domain.trim();
  // Strip protocol if present, then strip trailing slashes
  const domain = raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `https://${domain}`;
}
