const PostgresDriver = require('@cubejs-backend/postgres-driver');

// ============================================================================
// 1. 基础配置
// ============================================================================

/**
 * Cube 是否运行在开发模式。
 *
 * 开发模式下允许使用较短的 API Secret；
 * 生产环境则要求 Secret 至少 32 个字符。
 */
const devMode = process.env.CUBEJS_DEV_MODE === 'true';

/**
 * Cube 支持的认证模式：
 *
 * shared-secret
 *   AbacusFlow Server 自己签发 Cube Token，
 *   Cube 使用共享密钥验证 JWT。
 *
 * jwk
 *   Cube 通过 JWK URL 获取公钥，
 *   例如直接验证 Auth0 / OIDC Provider 签发的 JWT。
 */
const SUPPORTED_AUTH_MODES = ['shared-secret', 'jwk'];

/**
 * JWK 模式相关环境变量。
 *
 * shared-secret 模式下明确禁止配置这些变量，
 * 避免 Docker / 宿主机继承的环境变量意外开启 Cube JWT/JWK 验证。
 */
const JWK_ENVIRONMENT_VARIABLES = [
  'CUBEJS_JWK_URL',
  'CUBEJS_JWT_AUDIENCE',
  'CUBEJS_JWT_ISSUER',
  'CUBEJS_JWT_ALGS',
];


// ============================================================================
// 2. 环境变量工具函数
// ============================================================================

/**
 * 获取可选环境变量。
 *
 * - 自动 trim
 * - 空字符串视为未配置
 *
 * @param {string} name 环境变量名称
 * @returns {string | undefined}
 */
function getOptionalEnvironmentVariable(name) {
  return process.env[name]?.trim() || undefined;
}

/**
 * 获取必需环境变量。
 *
 * 如果变量不存在或者为空，则直接在 Cube 启动阶段失败，
 * 避免服务启动成功后才在查询阶段暴露配置错误。
 *
 * @param {string} name 环境变量名称
 * @param {string} [condition] 补充错误条件说明
 * @returns {string}
 */
function requireEnvironmentVariable(name, condition) {
  const value = getOptionalEnvironmentVariable(name);

  if (!value) {
    throw new Error(
      `${name} must be set${condition ? ` ${condition}` : ''}`,
    );
  }

  return value;
}

/**
 * 禁止指定环境变量出现。
 *
 * 注意这里使用 Object.hasOwn，而不是判断值是否为空。
 *
 * 这是故意的：
 * 即使 Docker 中存在：
 *
 *   CUBEJS_JWK_URL=
 *
 * 也会被认为“已经配置”。
 *
 * 这样可以防止 Cube 自身读取官方环境变量后，
 * 意外启用另一套 JWT 验证逻辑。
 *
 * @param {string[]} names
 * @param {string} condition
 */
function rejectEnvironmentVariables(names, condition) {
  const configuredNames = names.filter((name) =>
    Object.hasOwn(process.env, name),
  );

  if (configuredNames.length > 0) {
    throw new Error(
      `${configuredNames.join(', ')} must not be set ${condition}`,
    );
  }
}


// ============================================================================
// 3. 认证配置校验
// ============================================================================

/**
 * Cube 官方使用 CUBEJS_JWK_URL。
 *
 * CUBEJS_JWT_JWK_URL 不是当前项目支持的配置项，
 * 显式拒绝它可以避免因为变量名称写错导致难以排查的问题。
 */
if (Object.hasOwn(process.env, 'CUBEJS_JWT_JWK_URL')) {
  throw new Error(
    'CUBEJS_JWT_JWK_URL is not supported; use CUBEJS_JWK_URL in jwk mode',
  );
}

const authMode = requireEnvironmentVariable(
  'CUBEJS_AUTH_MODE',
).toLowerCase();

if (!SUPPORTED_AUTH_MODES.includes(authMode)) {
  throw new Error(
    'CUBEJS_AUTH_MODE must be either shared-secret or jwk',
  );
}

/**
 * Cube API Secret。
 *
 * 即使是 JWK 模式仍然保留该配置检查，
 * 因为 Cube 自身部分内部能力仍可能依赖 CUBEJS_API_SECRET。
 */
const apiSecret = requireEnvironmentVariable(
  'CUBEJS_API_SECRET',
);

if (!devMode && apiSecret.length < 32) {
  throw new Error(
    'CUBEJS_API_SECRET must contain at least 32 characters in production',
  );
}

/**
 * shared-secret 模式下禁止出现 JWK 配置。
 *
 * 原因不是这些变量一定会被下面的代码读取，
 * 而是 Cube 本身也可能直接读取官方 JWT 环境变量。
 *
 * 因此必须从配置层阻止两套认证机制同时存在。
 */
if (authMode === 'shared-secret') {
  rejectEnvironmentVariables(
    JWK_ENVIRONMENT_VARIABLES,
    'when CUBEJS_AUTH_MODE=shared-secret',
  );
}

/**
 * 解析 JWK 模式允许使用的 JWT 签名算法。
 *
 * 默认：
 *   RS256
 *
 * 也支持：
 *   CUBEJS_JWT_ALGS=RS256,RS512
 *
 * @returns {string[]}
 */
function getConfiguredJwtAlgorithms() {
  const algorithms = (
    getOptionalEnvironmentVariable('CUBEJS_JWT_ALGS') || 'RS256'
  )
    .split(',')
    .map((algorithm) => algorithm.trim())
    .filter(Boolean);

  if (algorithms.length === 0) {
    throw new Error(
      'CUBEJS_JWT_ALGS must contain at least one algorithm ' +
      'when CUBEJS_AUTH_MODE=jwk',
    );
  }

  return algorithms;
}

/**
 * 根据认证模式构造 Cube JWT 配置。
 *
 * shared-secret 模式：
 *   返回 undefined，不向 Cube 注入 JWK 配置。
 *
 * jwk 模式：
 *   要求完整配置 URL / audience / issuer / algorithms。
 */
function createJwtConfig() {
  if (authMode !== 'jwk') {
    return undefined;
  }

  return {
    jwkUrl: requireEnvironmentVariable(
      'CUBEJS_JWK_URL',
      'when CUBEJS_AUTH_MODE=jwk',
    ),

    audience: requireEnvironmentVariable(
      'CUBEJS_JWT_AUDIENCE',
      'when CUBEJS_AUTH_MODE=jwk',
    ),

    issuer: [
      requireEnvironmentVariable(
        'CUBEJS_JWT_ISSUER',
        'when CUBEJS_AUTH_MODE=jwk',
      ),
    ],

    algorithms: getConfiguredJwtAlgorithms(),
  };
}

const jwt = createJwtConfig();


// ============================================================================
// 4. 租户上下文
// ============================================================================

/**
 * 从 Cube securityContext 中读取并校验 tenantId。
 *
 * securityContext 来自 JWT Payload。
 *
 * 例如 AbacusFlow Server 签发的 Cube Token 中：
 *
 * {
 *   "tenantId": 123
 * }
 *
 * tenantId 必须：
 *
 * - 存在
 * - 可以转换成 Number
 * - 是安全整数
 * - 大于 0
 *
 * 所有访问数据的入口都应该通过这里获取 tenantId，
 * 避免不同位置存在不同的租户校验规则。
 *
 * @param {object} securityContext
 * @returns {number}
 */
function requireTenantId(securityContext) {
  const tenantId = Number(securityContext?.tenantId);

  if (!Number.isSafeInteger(tenantId) || tenantId <= 0) {
    throw new Error(
      'A valid tenantId is required in the Cube security context',
    );
  }

  return tenantId;
}

/**
 * 为租户生成 Cube 内部使用的 ID。
 *
 * contextToAppId 和 contextToOrchestratorId 使用完全相同的格式，
 * 因此统一放在这里，避免以后其中一个修改、另一个遗漏。
 *
 * @param {number} tenantId
 * @returns {string}
 */
function tenantContextId(tenantId) {
  return `tenant-${tenantId}`;
}


// ============================================================================
// 5. PostgreSQL Driver：注入 PostgreSQL RLS 租户上下文
// ============================================================================

/**
 * 面向单个租户的 PostgreSQL Driver。
 *
 * 每个 Driver 实例绑定一个 tenantId。
 *
 * 在连接准备完成后执行：
 *
 *   SELECT set_config('app.tenant_id', '<tenantId>', false)
 *
 * 从而给 PostgreSQL 当前 Session 设置：
 *
 *   app.tenant_id
 *
 * PostgreSQL RLS Policy 可以通过：
 *
 *   current_setting('app.tenant_id')
 *
 * 获取当前租户。
 *
 * 这是数据库层的租户隔离机制。
 */
class TenantPostgresDriver extends PostgresDriver {
  /**
   * @param {number} tenantId
   */
  constructor(tenantId) {
    super({
      /**
       * Cube 连接池大小。
       *
       * 当前服务器资源有限，因此默认仅使用 2 个连接。
       */
      maxPoolSize: Number(
        process.env.CUBEJS_DB_MAX_POOL || 2,
      ),

      /**
       * Cube 只负责分析查询，不应该修改业务数据库。
       */
      readOnly: true,
    });

    this.tenantId = tenantId;
  }

  /**
   * 每次数据库连接被 Cube 准备使用时，
   * 都重新设置当前租户。
   *
   * 不能只在 Driver constructor 中设置，因为 PostgreSQL
   * Connection Pool 中的物理连接会被重复复用。
   *
   * @param {*} connection
   * @param {*} options
   */
  async prepareConnection(connection, options) {
    await super.prepareConnection(connection, options);

    await connection.query(
      "SELECT set_config('app.tenant_id', $1, false)",
      [this.tenantId.toString()],
    );
  }
}


// ============================================================================
// 6. Query Rewrite：查询层再次强制增加 tenant_id 条件
// ============================================================================

/**
 * 从 Cube Query 中推断当前查询针对哪个 Cube。
 *
 * 优先顺序：
 *
 * 1. measures
 * 2. dimensions
 * 3. segments
 *
 * 例如：
 *
 *   Product.count
 *
 * 将解析出：
 *
 *   Product
 *
 * @param {object} query
 * @returns {string | undefined}
 */
function resolveCubeName(query) {
  return (
    query.measures?.[0]?.split('.')[0] ||
    query.dimensions?.[0]?.split('.')[0] ||
    query.segments?.[0]?.split('.')[0]
  );
}

/**
 * 在 Cube Query 层强制追加租户过滤条件。
 *
 * 例如原始查询：
 *
 * {
 *   measures: ['Product.count']
 * }
 *
 * 会被转换成：
 *
 * {
 *   measures: ['Product.count'],
 *   filters: [
 *     {
 *       member: 'Product.tenant_id',
 *       operator: 'equals',
 *       values: ['123']
 *     }
 *   ]
 * }
 *
 * 这样即使前端没有传 tenant_id，也会自动追加。
 *
 * 注意：
 * 这一层属于应用查询层防护。
 *
 * PostgreSQL RLS 才是最终的数据隔离边界。
 *
 * 因此目前实际上采用的是：
 *
 *   JWT securityContext
 *          ↓
 *   queryRewrite tenant filter
 *          ↓
 *   PostgreSQL app.tenant_id
 *          ↓
 *   PostgreSQL RLS
 *
 * 多层防御。
 *
 * @param {object} query
 * @param {object} securityContext
 * @returns {object}
 */
function rewriteQueryForTenant(query, securityContext) {
  const tenantId = requireTenantId(securityContext);
  const cubeName = resolveCubeName(query);

  if (!cubeName) {
    throw new Error(
      'Unable to determine the tenant-scoped cube for this query',
    );
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
}


// ============================================================================
// 7. Cube 配置导出
// ============================================================================

module.exports = {
  /**
   * 仅 JWK 模式下注入 JWT/JWK 配置。
   *
   * shared-secret 模式下不设置 jwt 字段。
   */
  ...(jwt ? { jwt } : {}),

  /**
   * 按 tenantId 隔离 Cube App。
   *
   * 不同租户会得到不同 appId：
   *
   * tenant-1
   * tenant-2
   * tenant-3
   */
  contextToAppId: ({ securityContext }) => {
    const tenantId = requireTenantId(securityContext);
    return tenantContextId(tenantId);
  },

  /**
   * 按 tenantId 隔离 Cube Orchestrator。
   *
   * 主要影响 Cube 查询编排、缓存、队列等内部资源的隔离。
   */
  contextToOrchestratorId: ({ securityContext }) => {
    const tenantId = requireTenantId(securityContext);
    return tenantContextId(tenantId);
  },

  /**
   * 为当前租户创建 PostgreSQL Driver。
   *
   * Driver 内部会把 tenantId 注入 PostgreSQL Session，
   * 供 RLS Policy 使用。
   */
  driverFactory: ({ securityContext }) => {
    const tenantId = requireTenantId(securityContext);
    return new TenantPostgresDriver(tenantId);
  },

  /**
   * 当前禁用 Scheduled Refresh。
   *
   * 多租户场景下不能简单使用一个全局 securityContext
   * 做 Scheduled Refresh，否则可能产生跨租户问题。
   *
   * 等未来需要预聚合 / 定时刷新时，
   * 应该显式枚举允许执行刷新的租户。
   */
  scheduledRefreshContexts: async () => [],

  /**
   * 强制为每一个 Cube 查询追加 tenant_id Filter。
   */
  queryRewrite: (query, { securityContext }) => {
    return rewriteQueryForTenant(
      query,
      securityContext,
    );
  },
};