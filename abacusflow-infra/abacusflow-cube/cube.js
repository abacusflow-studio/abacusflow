module.exports = {
  jwt: {
    jwkUrl: process.env.CUBEJS_JWT_JWK_URL,
    audience: process.env.CUBEJS_JWT_AUDIENCE,
    issuer: [process.env.CUBEJS_JWT_ISSUER],
    algorithms: ["RS256"],
  },
};
