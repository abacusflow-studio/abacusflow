export interface Auth0Config {
  domain: string;
  clientId: string;
  audience: string;
  redirectUri?: string;
}

export interface AppConfig {
  apiBaseUrl: string;
  auth0: Auth0Config;
  cubeEndpoint: string;
  version: string;
}

export interface AppConfigInput {
  apiBaseUrl?: string;
  auth0?: {
    domain?: string;
    clientId?: string;
    audience?: string;
    redirectUri?: string;
  };
  cubeEndpoint?: string;
  version?: string;
}

export interface DefineAppConfigOptions {
  requireAuth0?: boolean;
}

const DEFAULT_CONFIG: AppConfig = {
  apiBaseUrl: "/api",
  auth0: {
    domain: "",
    clientId: "",
    audience: "https://admin.abacusflow.cn",
  },
  cubeEndpoint: "/cubejs-api",
  version: "0.0.3",
};

let appConfig: AppConfig = DEFAULT_CONFIG;

export function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function defineAppConfig(
  input: AppConfigInput,
  options: DefineAppConfigOptions = {},
): AppConfig {
  const auth0Domain = options.requireAuth0
    ? required(input.auth0?.domain, "NEXT_PUBLIC_AUTH0_DOMAIN")
    : input.auth0?.domain ?? DEFAULT_CONFIG.auth0.domain;
  const auth0ClientId = options.requireAuth0
    ? required(input.auth0?.clientId, "NEXT_PUBLIC_AUTH0_CLIENT_ID")
    : input.auth0?.clientId ?? DEFAULT_CONFIG.auth0.clientId;

  return {
    apiBaseUrl: input.apiBaseUrl ?? DEFAULT_CONFIG.apiBaseUrl,
    auth0: {
      domain: auth0Domain,
      clientId: auth0ClientId,
      audience: input.auth0?.audience ?? DEFAULT_CONFIG.auth0.audience,
      redirectUri: input.auth0?.redirectUri,
    },
    cubeEndpoint: input.cubeEndpoint ?? DEFAULT_CONFIG.cubeEndpoint,
    version: input.version ?? DEFAULT_CONFIG.version,
  };
}

export function setAppConfig(config: AppConfig): void {
  appConfig = config;
}

export function getConfig(): AppConfig {
  return appConfig;
}

export function getCurrentVersion(): string {
  return getConfig().version;
}

export const CURRENT_VERSION = DEFAULT_CONFIG.version;

export interface VersionAnnouncement {
  version: string;
  date: string;
  content: string[];
}

export const ANNOUNCEMENTS: VersionAnnouncement[] = [
  {
    version: "0.0.3",
    date: "2025-07-03",
    content: ['📅 <strong>仪表盘</strong>查看商品热销Top10'],
  },
  {
    version: "0.0.2",
    date: "2025-07-02",
    content: [
      '🧾 <strong>库存打印</strong>支持列表式打印',
      '📊 <strong>销售 / 采购订单-详情</strong>订单明细列表展示',
    ],
  },
  {
    version: "0.0.1",
    date: "2025-06-30",
    content: [
      '🛡️ 产品删除前必须确保<strong>无关联订单</strong>，避免误删已交易商品',
      '🧾 新增销售单时支持<strong>当场添加客户</strong>，操作更便捷',
      '📊 客户 / 供应商列表页添加<strong>历史订单总结信息</strong>，助力销售判断',
      '📅 销售 / 采购订单支持按<strong>订单日期筛选</strong>，查找更灵活',
      '🔍 客户 / 供应商 / 产品 / 库存<strong>选择器</strong>现支持模糊搜索，查找更高效',
    ],
  },
];
