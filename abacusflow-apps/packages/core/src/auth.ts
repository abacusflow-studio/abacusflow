import type { UserProfile } from "./types";

export interface AuthClient {
  initialize(): Promise<void>;
  login(returnTo?: string): Promise<void>;
  handleRedirectCallback(): Promise<void>;
  logout(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  getAccessToken(): Promise<string>;
  getUser(): Promise<UserProfile | undefined>;
}

let authClient: AuthClient | null = null;

export function setAuthClient(client: AuthClient): void {
  authClient = client;
}

export function getAuthClient(): AuthClient {
  if (!authClient) {
    throw new Error("Auth client not initialized. Call setAuthClient() first.");
  }
  return authClient;
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp ? payload.exp < currentTime : true;
  } catch {
    return true;
  }
}

export function decodeToken(token: string): UserProfile | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload as UserProfile;
  } catch {
    return null;
  }
}
