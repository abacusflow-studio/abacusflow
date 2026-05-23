import { defineAppConfig, setAppConfig } from "@abacusflow/config";

export const appConfig = defineAppConfig(
  {
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    auth0: {
      domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN,
      clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID,
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
      redirectUri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI,
    },
    cubeEndpoint: process.env.NEXT_PUBLIC_CUBE_ENDPOINT,
    version: process.env.NEXT_PUBLIC_APP_VERSION,
  },
  { requireAuth0: true },
);

setAppConfig(appConfig);
