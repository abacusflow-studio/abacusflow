import { setAuthClient, type AuthClient, type UserProfile } from "@abacusflow/core";
import { getConfig } from "@abacusflow/config";

let currentToken: string | null = null;
let currentUser: UserProfile | null = null;

/**
 * Web auth provider using Auth0 SPA SDK.
 * In demo mode (no Auth0 configured), works without authentication.
 */
export function initWebAuth() {
  const config = getConfig();
  const hasAuth0 = config.auth0.clientId && config.auth0.domain;

  const client: AuthClient = {
    async initialize() {
      if (!hasAuth0) return;
      // Auth0 SPA SDK initialization would go here
      // For now, check if there's a stored token
      const stored = localStorage.getItem("auth_token");
      if (stored) {
        currentToken = stored;
        try {
          const payload = JSON.parse(atob(stored.split(".")[1]));
          currentUser = payload as UserProfile;
        } catch {
          // invalid token
          currentToken = null;
        }
      }
    },

    async login(returnTo?: string) {
      if (!hasAuth0) {
        console.log("Auth: demo mode - login skipped");
        return;
      }
      // In a real implementation, redirect to Auth0
      // For now, store the return path
      if (returnTo) {
        sessionStorage.setItem("auth_return_to", returnTo);
      }
      window.location.href = "/login";
    },

    async handleRedirectCallback() {
      // In a real implementation, parse the Auth0 callback
      // For demo mode, this is a no-op
    },

    async logout() {
      clearAuthToken();
      window.location.href = "/login";
    },

    async isAuthenticated() {
      if (!hasAuth0) return true;
      return !!currentToken;
    },

    async getAccessToken() {
      return currentToken ?? "";
    },

    async getUser() {
      return currentUser ?? undefined;
    },
  };

  setAuthClient(client);
  client.initialize();
}

/**
 * Set auth token after successful login.
 */
export function setAuthToken(token: string, user?: UserProfile) {
  currentToken = token;
  currentUser = user ?? null;
  localStorage.setItem("auth_token", token);
  // Set cookie for middleware to check
  document.cookie = `auth_token=${token}; path=/; max-age=86400; SameSite=Lax`;
}

/**
 * Clear auth token.
 */
export function clearAuthToken() {
  currentToken = null;
  currentUser = null;
  localStorage.removeItem("auth_token");
  document.cookie = "auth_token=; path=/; max-age=0";
}
