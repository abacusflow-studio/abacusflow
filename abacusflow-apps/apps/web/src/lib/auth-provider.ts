import { createAuth0Client, Auth0Client } from "@auth0/auth0-spa-js";
import { setAuthClient, setRedirect, type AuthClient, type UserProfile } from "@abacusflow/core";
import { getConfig } from "@abacusflow/config";

let auth0Client: Auth0Client | null = null;

export async function initWebAuth(): Promise<void> {
  const config = getConfig();

  auth0Client = await createAuth0Client({
    domain: config.auth0.domain,
    clientId: config.auth0.clientId,
    authorizationParams: {
      audience: config.auth0.audience,
      redirect_uri: window.location.origin + "/callback",
    },
  });

  const client: AuthClient = {
    async initialize() {},

    async login(returnTo?: string) {
      if (returnTo) {
        sessionStorage.setItem("auth_return_to", returnTo);
      }
      await auth0Client!.loginWithRedirect();
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
