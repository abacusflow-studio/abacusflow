export type MenuDisplayScope = "PLATFORM" | "TENANT" | "BUSINESS";

export type MenuIcon =
  | "dashboard"
  | "inventory"
  | "transaction"
  | "purchase"
  | "sale"
  | "product"
  | "partner"
  | "customer"
  | "supplier"
  | "depot"
  | "analytics"
  | "feedback"
  | "platform"
  | "tenant"
  | "user"
  | "permission"
  | "role";

export interface MenuRegistryEntry {
  readonly key: string;
  readonly route: string | null;
  readonly label: string;
  readonly icon: MenuIcon;
  readonly displayScope: MenuDisplayScope;
  readonly requiredPermission: string | null;
  readonly children?: readonly MenuRegistryEntry[];
}

export interface PermissionSnapshot {
  readonly platformPermissions: readonly string[];
  readonly tenantPermissions: readonly string[];
}

export const MENU_REGISTRY = [
  {
    key: "/dashboard",
    route: "/dashboard",
    label: "仪表盘",
    icon: "dashboard",
    displayScope: "BUSINESS",
    requiredPermission: "business:inventory:read",
  },
  {
    key: "/inventory",
    route: "/inventory",
    label: "库存管理",
    icon: "inventory",
    displayScope: "BUSINESS",
    requiredPermission: "business:inventory:read",
  },
  {
    key: "/transaction",
    route: null,
    label: "交易管理",
    icon: "transaction",
    displayScope: "BUSINESS",
    requiredPermission: null,
    children: [
      {
        key: "/transaction/purchase-order",
        route: "/transaction/purchase-order",
        label: "采购单管理",
        icon: "purchase",
        displayScope: "BUSINESS",
        requiredPermission: "business:purchase-order:read",
      },
      {
        key: "/transaction/sale-order",
        route: "/transaction/sale-order",
        label: "销售单管理",
        icon: "sale",
        displayScope: "BUSINESS",
        requiredPermission: "business:sale-order:read",
      },
    ],
  },
  {
    key: "/products-group",
    route: null,
    label: "产品中心",
    icon: "product",
    displayScope: "BUSINESS",
    requiredPermission: null,
    children: [
      {
        key: "/products",
        route: "/products",
        label: "产品管理",
        icon: "product",
        displayScope: "BUSINESS",
        requiredPermission: "business:product:read",
      },
      {
        key: "/products/category",
        route: "/products/category",
        label: "产品类别管理",
        icon: "product",
        displayScope: "BUSINESS",
        requiredPermission: "business:product-category:read",
      },
    ],
  },
  {
    key: "/partner",
    route: null,
    label: "合作伙伴",
    icon: "partner",
    displayScope: "BUSINESS",
    requiredPermission: null,
    children: [
      {
        key: "/partner/customer",
        route: "/partner/customer",
        label: "客户管理",
        icon: "customer",
        displayScope: "BUSINESS",
        requiredPermission: "business:customer:read",
      },
      {
        key: "/partner/supplier",
        route: "/partner/supplier",
        label: "供应商管理",
        icon: "supplier",
        displayScope: "BUSINESS",
        requiredPermission: "business:supplier:read",
      },
    ],
  },
  {
    key: "/depots",
    route: "/depots",
    label: "储存点管理",
    icon: "depot",
    displayScope: "BUSINESS",
    requiredPermission: "business:depot:read",
  },
  {
    key: "/analytics",
    route: "/analytics",
    label: "数据刻画",
    icon: "analytics",
    displayScope: "BUSINESS",
    requiredPermission: "business:inventory:read",
  },
  {
    key: "/feedback",
    route: "/feedback",
    label: "问题反馈",
    icon: "feedback",
    displayScope: "BUSINESS",
    requiredPermission: "business:feedback:read",
  },
  {
    key: "/platform",
    route: null,
    label: "平台中心",
    icon: "platform",
    displayScope: "PLATFORM",
    requiredPermission: null,
    children: [
      {
        key: "/platform/tenants",
        route: "/platform/tenants",
        label: "租户管理",
        icon: "tenant",
        displayScope: "PLATFORM",
        requiredPermission: "platform:tenant:list",
      },
      {
        key: "/platform/users",
        route: "/platform/users",
        label: "用户管理",
        icon: "user",
        displayScope: "PLATFORM",
        requiredPermission: "platform:user:read",
      },
      {
        key: "/platform/permissions",
        route: "/platform/permissions",
        label: "权限管理",
        icon: "permission",
        displayScope: "PLATFORM",
        requiredPermission: "platform:permission:read",
      },
      {
        key: "/platform/roles",
        route: "/platform/roles",
        label: "平台角色",
        icon: "role",
        displayScope: "PLATFORM",
        requiredPermission: "platform:role:read",
      },
    ],
  },
  {
    key: "/tenant-group",
    route: null,
    label: "租户空间",
    icon: "tenant",
    displayScope: "TENANT",
    requiredPermission: null,
    children: [
      {
        key: "/tenant",
        route: "/tenant",
        label: "基本信息",
        icon: "tenant",
        displayScope: "TENANT",
        requiredPermission: "tenant:profile:read",
      },
      {
        key: "/tenant/members",
        route: "/tenant/members",
        label: "成员",
        icon: "user",
        displayScope: "TENANT",
        requiredPermission: "tenant:member:read",
      },
      {
        key: "/tenant/roles",
        route: "/tenant/roles",
        label: "角色",
        icon: "role",
        displayScope: "TENANT",
        requiredPermission: "tenant:role:read",
      },
    ],
  },
] as const satisfies readonly MenuRegistryEntry[];

export function canPermission(permission: string, snapshot: PermissionSnapshot): boolean {
  if (permission.startsWith("platform:")) {
    return snapshot.platformPermissions.includes(permission);
  }
  if (permission.startsWith("tenant:") || permission.startsWith("business:")) {
    return snapshot.tenantPermissions.includes(permission);
  }
  return false;
}

export function filterMenuRegistry(
  snapshot: PermissionSnapshot,
  entries: readonly MenuRegistryEntry[] = MENU_REGISTRY,
): MenuRegistryEntry[] {
  return entries.flatMap((entry) => {
    const children = entry.children ? filterMenuRegistry(snapshot, entry.children) : undefined;
    if (children) {
      return children.length > 0 ? [{ ...entry, children }] : [];
    }
    return entry.requiredPermission && canPermission(entry.requiredPermission, snapshot) ? [entry] : [];
  });
}

export function firstVisibleRoute(entries: readonly MenuRegistryEntry[]): string | null {
  for (const entry of entries) {
    if (entry.route) return entry.route;
    const childRoute = entry.children ? firstVisibleRoute(entry.children) : null;
    if (childRoute) return childRoute;
  }
  return null;
}
