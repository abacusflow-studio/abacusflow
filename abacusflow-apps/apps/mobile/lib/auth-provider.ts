import { setAuthClient, type AuthClient, type UserProfile } from "@abacusflow/core";

let currentToken: string | null = null;
let currentUser: UserProfile | null = null;

/**
 * Simple auth provider for mobile.
 * In demo mode (no Auth0 configured), the app works without authentication.
 * To enable Auth0, install expo-auth-session and configure the provider.
 */
export function initMobileAuth() {
  const client: AuthClient = {
    async initialize() {
      // No-op for demo mode
    },
    async login() {
      // In demo mode, just set a flag
      console.log("Auth: demo mode - login skipped");
    },
    async handleRedirectCallback() {
      // No-op
    },
    async logout() {
      currentToken = null;
      currentUser = null;
    },
    async isAuthenticated() {
      // In demo mode, always return true to allow API calls without auth
      return true;
    },
    async getAccessToken() {
      return currentToken ?? "";
    },
    async getUser() {
      return currentUser ?? undefined;
    },
  };

  setAuthClient(client);
}

/**
 * Set a token for authenticated mode (e.g., after Auth0 login).
 */
export function setAuthToken(token: string, user?: UserProfile) {
  currentToken = token;
  currentUser = user ?? null;
}

/**
 * Clear auth state.
 */
export function clearAuth() {
  currentToken = null;
  currentUser = null;
}
