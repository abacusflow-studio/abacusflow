const PostgresDriver = require('@cubejs-backend/postgres-driver');

const devMode = process.env.CUBEJS_DEV_MODE === 'true';
const apiSecret = process.env.CUBEJS_API_SECRET || '';

if (!devMode && apiSecret.length < 32) {
  throw new Error('CUBEJS_API_SECRET must contain at least 32 characters in production');
}

function requireTenantId(securityContext) {
  const tenantId = Number(securityContext?.tenantId);
  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new Error('A valid tenantId is required in the Cube security context');
  }
  return tenantId;
}

class TenantPostgresDriver extends PostgresDriver {
  constructor(tenantId) {
    super({
      maxPoolSize: Number(process.env.CUBEJS_DB_MAX_POOL || 2),
      readOnly: true,
    });
    this.tenantId = tenantId;
  }

  async prepareConnection(connection, options) {
    await super.prepareConnection(connection, options);
    await connection.query("SELECT set_config('app.tenant_id', $1, false)", [
      this.tenantId.toString(),
    ]);
  }
}

const jwkUrl = process.env.CUBEJS_JWT_JWK_URL;
const jwt = jwkUrl
  ? {
      jwkUrl,
      audience: process.env.CUBEJS_JWT_AUDIENCE,
      issuer: [process.env.CUBEJS_JWT_ISSUER],
      algorithms: ['RS256'],
    }
  : undefined;

module.exports = {
  ...(jwt ? { jwt } : {}),

  contextToAppId: ({ securityContext }) => {
    return `tenant-${requireTenantId(securityContext)}`;
  },

  contextToOrchestratorId: ({ securityContext }) => {
    return `tenant-${requireTenantId(securityContext)}`;
  },

  driverFactory: ({ securityContext }) => {
    return new TenantPostgresDriver(requireTenantId(securityContext));
  },

  scheduledRefreshContexts: async () => [],

  queryRewrite: (query, { securityContext }) => {
    const tenantId = requireTenantId(securityContext);
    // Determine the cube name from the query
    const cubeName = query.measures?.[0]?.split('.')[0]
      || query.dimensions?.[0]?.split('.')[0]
      || query.segments?.[0]?.split('.')[0];

    if (!cubeName) {
      throw new Error('Unable to determine the tenant-scoped cube for this query');
    }

    return {
      ...query,
      filters: [
        ...(query.filters || []),
        {
          member: `${cubeName}.tenant_id`,
          operator: 'equals',
          values: [tenantId.toString()],
        },
      ],
    };
  },
};
