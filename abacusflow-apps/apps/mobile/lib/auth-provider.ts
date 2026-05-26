import * as AuthSession from "expo-auth-session";
import * as SecureStore from "@/lib/secure-storage";
import * as WebBrowser from "expo-web-browser";

import {
  setAuthClient,
  type AuthClient,
  type UserProfile,
  userApi,
} from "@abacusflow/core";

import {
  appConfig,
  getAuth0Issuer,
  MOBILE_AUTH_CALLBACK_PATH,
  MOBILE_AUTH_SCHEME,
  mobileConfigIssues,
} from "@/config/app-config";

WebBrowser.maybeCompleteAuthSession();

const TOKEN_STORE_KEY = "abacusflow.mobile.auth.token";
const AUTH_SCOPES = ["openid", "profile", "email", "offline_access"];

export interface MobileAuthSnapshot {
  ready: boolean;
  authenticated: boolean;
  signingIn: boolean;
  user?: UserProfile;
  error?: string;
  configIssues: string[];
}

type Listener = (snapshot: MobileAuthSnapshot) => void;

let authInitialized = false;
let initializePromise: Promise<void> | null = null;
let discoveryPromise: Promise<AuthSession.DiscoveryDocument> | null = null;
let currentToken: AuthSession.TokenResponse | null = null;
let currentUser: UserProfile | undefined;
const listeners = new Set<Listener>();

let snapshot: MobileAuthSnapshot = {
  ready: false,
  authenticated: false,
  signingIn: false,
  configIssues: mobileConfigIssues,
};

function publish(patch: Partial<MobileAuthSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener(snapshot));
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "操作失败";
}

function assertConfigReady(): void {
  if (mobileConfigIssues.length > 0) {
    throw new Error(`移动端缺少配置: ${mobileConfigIssues.join(", ")}`);
  }
}

function getRedirectUri(): string {
  if (appConfig.auth0.redirectUri) return appConfig.auth0.redirectUri;

  // Expo Go 不支持自定义 scheme，去掉 native 参数让 Expo 自动选择：
  // Expo Go → https://auth.expo.io/@username/slug
  // Dev build → abacusflow://oauth/callback
  return AuthSession.makeRedirectUri({
    scheme: MOBILE_AUTH_SCHEME,
    path: MOBILE_AUTH_CALLBACK_PATH,
    native: `${MOBILE_AUTH_SCHEME}://${MOBILE_AUTH_CALLBACK_PATH}`
  });
}

function getDiscovery(): Promise<AuthSession.DiscoveryDocument> {
  if (!discoveryPromise) {
    discoveryPromise = AuthSession.fetchDiscoveryAsync(getAuth0Issuer());
  }
  return discoveryPromise;
}

function isTokenFresh(token: AuthSession.TokenResponse): boolean {
  return AuthSession.TokenResponse.isTokenFresh(token, 60);
}

async function saveToken(token: AuthSession.TokenResponse): Promise<void> {
  currentToken = token;
  await SecureStore.setItemAsync(
    TOKEN_STORE_KEY,
    JSON.stringify(token.getRequestConfig()),
  );
}

async function loadToken(): Promise<AuthSession.TokenResponse | null> {
  const raw = await SecureStore.getItemAsync(TOKEN_STORE_KEY);
  if (!raw) return null;

  try {
    return new AuthSession.TokenResponse(JSON.parse(raw));
  } catch {
    await SecureStore.deleteItemAsync(TOKEN_STORE_KEY);
    return null;
  }
}

async function clearToken(): Promise<void> {
  currentToken = null;
  currentUser = undefined;
  await SecureStore.deleteItemAsync(TOKEN_STORE_KEY);
}

async function refreshTokenIfNeeded(): Promise<AuthSession.TokenResponse | null> {
  if (!currentToken) return null;
  if (isTokenFresh(currentToken)) return currentToken;
  if (!currentToken.refreshToken) {
    await clearToken();
    return null;
  }

  const discovery = await getDiscovery();
  if (!discovery.tokenEndpoint) {
    throw new Error("Auth0 discovery 缺少 tokenEndpoint");
  }

  const refreshed = await AuthSession.refreshAsync(
    {
      clientId: appConfig.auth0.clientId,
      refreshToken: currentToken.refreshToken,
    },
    { tokenEndpoint: discovery.tokenEndpoint },
  );

  if (!refreshed.refreshToken) {
    refreshed.refreshToken = currentToken.refreshToken;
  }
  await saveToken(refreshed);
  return refreshed;
}

async function fetchAuth0User(
  token: AuthSession.TokenResponse,
): Promise<UserProfile | undefined> {
  const discovery = await getDiscovery();
  if (!discovery.userInfoEndpoint) return currentUser;

  try {
    return (await AuthSession.fetchUserInfoAsync(
      { accessToken: token.accessToken },
      { userInfoEndpoint: discovery.userInfoEndpoint },
    )) as UserProfile;
  } catch {
    return currentUser;
  }
}

async function syncAuthenticatedSession(): Promise<void> {
  const token = await refreshTokenIfNeeded();
  if (!token) {
    publish({
      ready: true,
      authenticated: false,
      user: undefined,
      error: undefined,
    });
    return;
  }

  const profile = (await fetchAuth0User(token)) ?? {};
  try {
    const bootstrap = await userApi.bootstrap();
    currentUser = {
      ...profile,
      userId: bootstrap.userId,
      name: bootstrap.displayName ?? profile.name,
      email: bootstrap.email ?? profile.email,
      picture: bootstrap.pictureUrl ?? profile.picture,
      roles: bootstrap.roles,
      permissions: bootstrap.permissions,
      enabled: bootstrap.enabled,
      locked: bootstrap.locked,
    };
    publish({
      ready: true,
      authenticated: true,
      user: currentUser,
      error: undefined,
    });
  } catch (error) {
    currentUser = profile;
    publish({
      ready: true,
      authenticated: true,
      user: currentUser,
      error: `登录成功，但同步后端用户失败: ${toErrorMessage(error)}`,
    });
  }
}

const mobileAuthClient: AuthClient = {
  async initialize() {
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
      if (mobileConfigIssues.length > 0) {
        publish({ ready: true, authenticated: false });
        return;
      }

      publish({ ready: false, error: undefined });
      try {
        currentToken = await loadToken();
        if (!currentToken) {
          publish({ ready: true, authenticated: false, user: undefined });
          return;
        }
        await syncAuthenticatedSession();
      } catch (error) {
        await clearToken();
        publish({
          ready: true,
          authenticated: false,
          user: undefined,
          error: toErrorMessage(error),
        });
      }
    })();

    return initializePromise;
  },

  async login() {
    assertConfigReady();
    publish({ signingIn: true, error: undefined });

    try {
      const discovery = await getDiscovery();
      if (!discovery.authorizationEndpoint || !discovery.tokenEndpoint) {
        throw new Error("Auth0 discovery 缺少授权端点");
      }

      const redirectUri = getRedirectUri();
      const request = await AuthSession.loadAsync(
        {
          clientId: appConfig.auth0.clientId,
          redirectUri,
          responseType: AuthSession.ResponseType.Code,
          scopes: AUTH_SCOPES,
          usePKCE: true,
          extraParams: {
            audience: appConfig.auth0.audience,
          },
        },
        discovery,
      );

      const result = await request.promptAsync(discovery);
      if (result.type !== "success") {
        publish({ ready: true, signingIn: false });
        return;
      }

      const code = result.params.code;
      if (!code) {
        throw new Error("Auth0 未返回授权码");
      }

      const token = await AuthSession.exchangeCodeAsync(
        {
          clientId: appConfig.auth0.clientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier ?? "",
          },
        },
        { tokenEndpoint: discovery.tokenEndpoint },
      );

      await saveToken(token);
      await syncAuthenticatedSession();
    } catch (error) {
      await clearToken();
      publish({
        ready: true,
        authenticated: false,
        user: undefined,
        error: toErrorMessage(error),
      });
    } finally {
      publish({ signingIn: false });
    }
  },

  async handleRedirectCallback() {
    return;
  },

  async logout() {
    const tokenToRevoke = currentToken?.refreshToken ?? currentToken?.accessToken;
    try {
      const discovery = await getDiscovery();
      if (tokenToRevoke && discovery.revocationEndpoint) {
        await AuthSession.revokeAsync(
          {
            clientId: appConfig.auth0.clientId,
            token: tokenToRevoke,
            tokenTypeHint: currentToken?.refreshToken
              ? AuthSession.TokenTypeHint.RefreshToken
              : AuthSession.TokenTypeHint.AccessToken,
          },
          { revocationEndpoint: discovery.revocationEndpoint },
        );
      }
    } catch {
      // Local logout still succeeds if Auth0 token revocation is unavailable.
    } finally {
      await clearToken();
      publish({
        ready: true,
        authenticated: false,
        user: undefined,
        error: undefined,
      });
    }
  },

  async isAuthenticated() {
    return !!(await refreshTokenIfNeeded());
  },

  async getAccessToken() {
    const token = await refreshTokenIfNeeded();
    return token?.accessToken ?? "";
  },

  async getUser() {
    return currentUser;
  },
};

export function initMobileAuth(): void {
  if (authInitialized) return;
  setAuthClient(mobileAuthClient);
  authInitialized = true;
}

export function initializeMobileAuthSession(): Promise<void> {
  initMobileAuth();
  return mobileAuthClient.initialize();
}

export function loginMobileAuth(): Promise<void> {
  initMobileAuth();
  return mobileAuthClient.login();
}

export function logoutMobileAuth(): Promise<void> {
  initMobileAuth();
  return mobileAuthClient.logout();
}

export function getMobileAuthSnapshot(): MobileAuthSnapshot {
  return snapshot;
}

export function subscribeMobileAuth(listener: Listener): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
}
