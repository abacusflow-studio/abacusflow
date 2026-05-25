import { Auth0Client } from "@auth0/auth0-spa-js";
import {
  setAuthClient,
  setRedirect,
  type AuthClient,
  type UserProfile,
} from "@abacusflow/core";
import { appConfig } from "../config/app-config";

let auth0Client: Auth0Client | null = null;
let loginRedirectPromise: Promise<void> | null = null;

function apiUrl(path: string): string {
  return `${appConfig.apiBaseUrl.replace(/\/$/, "")}${path}`;
}

export async function bootstrapWebAuthSession(): Promise<void> {
  if (!auth0Client) {
    throw new Error("Auth0 client is not initialized.");
  }

  const accessToken = await auth0Client.getTokenSilently({
    timeoutInSeconds: 10,
  });
  if (!accessToken) {
    throw new Error("Unable to get access token for user bootstrap.");
  }

  const response = await fetch(apiUrl("/me/bootstrap"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `User bootstrap failed with ${response.status}${detail ? `: ${detail}` : ""}`,
    );
  }
}

export async function initWebAuth(): Promise<void> {
  const authorizationParams = {
    audience: appConfig.auth0.audience,
    redirect_uri:
      appConfig.auth0.redirectUri ?? window.location.origin + "/callback",
  };

  auth0Client = new Auth0Client({
    domain: appConfig.auth0.domain,
    clientId: appConfig.auth0.clientId,
    cacheLocation: "localstorage",
    authorizationParams,
  });

  const client: AuthClient = {
    async initialize() {},

    async login(returnTo?: string) {
      if (returnTo) {
        sessionStorage.setItem("auth_return_to", returnTo);
      }
      if (!loginRedirectPromise) {
        loginRedirectPromise = auth0Client!
          .loginWithRedirect({ authorizationParams })
          .finally(() => {
            loginRedirectPromise = null;
          });
      }
      await loginRedirectPromise;
    },

    async handleRedirectCallback() {
      await auth0Client!.handleRedirectCallback();
    },

    async logout() {
      auth0Client!.logout({
        logoutParams: { returnTo: window.location.origin + "/login" },
      });
    },

    async isAuthenticated() {
      return auth0Client!.isAuthenticated();
    },

    async getAccessToken() {
      try {
        if (!(await auth0Client!.isAuthenticated())) {
          return "";
        }
        return await auth0Client!.getTokenSilently({ timeoutInSeconds: 5 });
      } catch {
        return "";
      }
    },

    async getUser() {
      const user = await auth0Client!.getUser();
      if (!user) return undefined;
      return {
        sub: user.sub,
        name: user.name,
        nickname: user.nickname,
        picture: user.picture,
        email: user.email,
      } as UserProfile;
    },
  };

  setAuthClient(client);
  setRedirect((path) => {
    window.location.href = path;
  });
  await client.initialize();
}
