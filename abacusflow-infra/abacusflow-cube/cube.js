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

// ============================================================================
// 2. Cube 原生认证配置校验
// ============================================================================

/**
 * 认证完全交给 Cube 官方环境变量处理，不在 cube.js 中重复实现：
 *
 * - 未配置 CUBEJS_JWK_URL：Cube 使用 CUBEJS_API_SECRET 验证共享密钥 JWT。
 * - 配置 CUBEJS_JWK_URL：Cube 使用 JWK、issuer、audience 等官方配置验证 JWT。
 *
 * Dockerfile 和 shared-secret 部署中不能写入空的 CUBEJS_JWK_* / CUBEJS_JWT_*
 * 变量，否则 Cube 仍可能将“存在但为空”的变量识别为 JWK 校验配置。
 */
const apiSecret = process.env.CUBEJS_API_SECRET?.trim() || '';

if (!devMode && apiSecret.length < 32) {
  throw new Error(
    'CUBEJS_API_SECRET must contain at least 32 characters in production',
  );
}

// ============================================================================
// 3. 租户上下文
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
// 4. PostgreSQL Driver：注入 PostgreSQL RLS 租户上下文
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
// 5. Query Rewrite：查询层再次强制增加 tenant_id 条件
// ============================================================================

/**
 * 从成员名中提取 Cube 名称。
 *
 * 例如 `inventory_unit.quantity` 会得到 `inventory_unit`。
 * 无效成员名返回 undefined，交由后续的“未找到 Cube”校验统一处理。
 *
 * @param {*} member
 * @returns {string | undefined}
 */
function cubeNameFromMember(member) {
  if (typeof member !== 'string') {
    return undefined;
  }

  const separatorIndex = member.indexOf('.');
  if (separatorIndex <= 0) {
    return undefined;
  }

  return member.slice(0, separatorIndex);
}

/**
 * 收集查询中引用的全部 Cube，而不是只处理第一个 measure 所属的 Cube。
 *
 * 关联查询可能同时包含：
 *
 * - measures / dimensions / segments
 * - timeDimensions
 * - 嵌套的 and / or filters
 * - object 或 tuple-array 两种 order 格式
 *
 * 如果只给第一个 Cube 增加租户条件，`inventory_unit + depot` 这类关联分析
 * 就可能遗漏关联表的查询层过滤。
 *
 * @param {object} query
 * @returns {string[]}
 */
function resolveCubeNames(query) {
  const cubeNames = new Set();

  const addMember = (member) => {
    const cubeName = cubeNameFromMember(member);
    if (cubeName) {
      cubeNames.add(cubeName);
    }
  };

  const addMembers = (members) => {
    if (Array.isArray(members)) {
      members.forEach(addMember);
    }
  };

  const visitFilter = (filter) => {
    if (!filter || typeof filter !== 'object') {
      return;
    }

    addMember(filter.member || filter.dimension);
    filter.and?.forEach(visitFilter);
    filter.or?.forEach(visitFilter);
  };

  addMembers(query.measures);
  addMembers(query.dimensions);
  addMembers(query.segments);
  query.timeDimensions?.forEach(({ dimension }) => addMember(dimension));
  query.filters?.forEach(visitFilter);

  if (Array.isArray(query.order)) {
    query.order.forEach((orderEntry) => {
      if (Array.isArray(orderEntry)) {
        addMember(orderEntry[0]);
      } else {
        addMember(orderEntry?.id || orderEntry?.member);
      }
    });
  } else if (query.order && typeof query.order === 'object') {
    Object.keys(query.order).forEach(addMember);
  }

  return [...cubeNames];
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
  const cubeNames = resolveCubeNames(query);

  if (cubeNames.length === 0) {
    throw new Error(
      'Unable to determine the tenant-scoped cube for this query',
    );
  }

  return {
    ...query,

    filters: [
      ...(query.filters || []),
      ...cubeNames.map((cubeName) => ({
        member: `${cubeName}.tenant_id`,
        operator: 'equals',
        values: [tenantId.toString()],
      })),
    ],
  };
}


// ============================================================================
// 6. Cube 配置导出
// ============================================================================

module.exports = {
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
