module.exports = {
  jwt: {
    jwkUrl: process.env.CUBEJS_JWT_JWK_URL,
    audience: process.env.CUBEJS_JWT_AUDIENCE,
    issuer: [process.env.CUBEJS_JWT_ISSUER],
    algorithms: ["RS256", "HS256"],
  },

  contextToAppId: ({ securityContext }) => {
    return securityContext?.tenantId || 'default';
  },

  queryRewrite: (query, { securityContext }) => {
    if (!securityContext?.tenantId) {
      throw new Error('No tenant context provided');
    }
    // Determine the cube name from the query
    const cubeName = query.measures?.[0]?.split('.')[0]
      || query.dimensions?.[0]?.split('.')[0]
      || query.segments?.[0]?.split('.')[0];

    return {
      ...query,
      filters: [
        ...(query.filters || []),
        {
          member: `${cubeName}.tenant_id`,
          operator: 'equals',
          values: [securityContext.tenantId.toString()],
        },
      ],
    };
  },
};
