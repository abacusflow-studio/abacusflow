import { Auth0Client } from "@auth0/auth0-spa-js";
import { setAuthClient, setRedirect, type AuthClient, type UserProfile } from "@abacusflow/core";
import { appConfig } from "../config/app-config";

let auth0Client: Auth0Client | null = null;

export async function initWebAuth(): Promise<void> {
  const authorizationParams = {
    audience: appConfig.auth0.audience,
    redirect_uri: appConfig.auth0.redirectUri ?? window.location.origin + "/callback",
  };

  auth0Client = new Auth0Client({
    domain: appConfig.auth0.domain,
    clientId: appConfig.auth0.clientId,
    authorizationParams,
  });

  const client: AuthClient = {
    async initialize() {},

    async login(returnTo?: string) {
      if (returnTo) {
        sessionStorage.setItem("auth_return_to", returnTo);
      }
      await auth0Client!.loginWithRedirect({ authorizationParams });
    },

    async handleRedirectCallback() {
      await auth0Client!.handleRedirectCallback();
    },

    async logout() {
      auth0Client!.logout({ logoutParams: { returnTo: window.location.origin + "/login" } });
    },

    async isAuthenticated() {
      return auth0Client!.isAuthenticated();
    },

    async getAccessToken() {
      try {
        return await auth0Client!.getTokenSilently();
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
