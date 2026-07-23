"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Layout, Menu, Dropdown, Modal, Tag } from "antd";
import type { MenuProps } from "antd";
import {
  AppstoreOutlined,
  AreaChartOutlined,
  BankOutlined,
  DashboardOutlined,
  ExclamationCircleOutlined,
  HomeOutlined,
  InboxOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  SunOutlined,
  SwapOutlined,
  TeamOutlined,
  TransactionOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  getAuthClient,
  getStoredTenantId,
  tenantApi,
  userApi,
} from "@abacusflow/core";
import type { TenantInfo } from "@abacusflow/core";
import { useTheme } from "../../components/providers";
import { useTenant } from "../../components/tenant-provider";
import { useAuth } from "../../components/auth-provider";
import { FeedbackModal } from "../../components/feedback-modal";
import {
  filterMenuRegistry,
  firstVisibleRoute,
  type MenuIcon,
  type MenuRegistryEntry,
} from "../../lib/menu-registry";
import { resolveBootstrapTenantId } from "../../lib/tenant-bootstrap";

const { Sider, Header, Content, Footer } = Layout;

type MenuItemType = Required<MenuProps>["items"][number];

const MENU_ICONS: Record<MenuIcon, React.ReactNode> = {
  dashboard: <DashboardOutlined />,
  inventory: <InboxOutlined />,
  transaction: <TransactionOutlined />,
  purchase: <ShoppingCartOutlined />,
  sale: <ShopOutlined />,
  product: <AppstoreOutlined />,
  partner: <TeamOutlined />,
  customer: <UserOutlined />,
  supplier: <BankOutlined />,
  depot: <HomeOutlined />,
  analytics: <AreaChartOutlined />,
  feedback: <ExclamationCircleOutlined />,
  platform: <SettingOutlined />,
  tenant: <ShopOutlined />,
  user: <UserOutlined />,
  permission: <SettingOutlined />,
  role: <TeamOutlined />,
};

function toMenuItem(entry: MenuRegistryEntry): MenuItemType {
  return {
    key: entry.key,
    label: entry.route ? <Link href={entry.route}>{entry.label}</Link> : entry.label,
    icon: MENU_ICONS[entry.icon],
    children: entry.children?.map(toMenuItem),
  } as MenuItemType;
}

const ROUTE_META = [
  { key: "/dashboard", title: "业务仪表盘", subtitle: "全链路库存与订单信号" },
  {
    key: "/inventory",
    title: "库存管理",
    subtitle: "库存单元、仓点与安全库存",
  },
  {
    key: "/transaction/purchase-order",
    title: "采购单管理",
    subtitle: "入库采购链路",
  },
  {
    key: "/transaction/sale-order",
    title: "销售单管理",
    subtitle: "出库销售链路",
  },
  {
    key: "/products/category",
    title: "产品类别管理",
    subtitle: "产品目录结构",
  },
  { key: "/products", title: "产品管理", subtitle: "产品编码与产品资料" },
  {
    key: "/partner/customer",
    title: "客户管理",
    subtitle: "客户网络与联系方式",
  },
  { key: "/partner/supplier", title: "供应商管理", subtitle: "供应侧伙伴资料" },
  { key: "/depots", title: "储存点管理", subtitle: "仓点位置与容量" },
  { key: "/analytics", title: "数据刻画", subtitle: "业务趋势与指标洞察" },
  { key: "/feedback", title: "问题反馈", subtitle: "用户反馈查看与处理" },
  { key: "/platform/tenants", title: "租户管理", subtitle: "租户创建与配置" },
  { key: "/platform/users", title: "用户管理", subtitle: "系统用户账号管理" },
  { key: "/platform/permissions", title: "权限管理", subtitle: "权限定义与配置" },
  { key: "/platform/roles", title: "平台角色", subtitle: "全局平台授权" },
  { key: "/tenant", title: "基本信息", subtitle: "当前租户详情" },
  { key: "/tenant/members", title: "成员", subtitle: "成员管理与角色分配" },
  { key: "/tenant/roles", title: "角色", subtitle: "角色与权限配置" },
];

const ALL_ROUTE_KEYS = ROUTE_META.map((item) => item.key);

type AuthStatus = "checking" | "authenticated" | "redirecting" | "tenant_redirect";

function getCurrentBrowserPath() {
  if (typeof window === "undefined") {
    return "/dashboard";
  }
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}` || "/dashboard";
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [showFeedback, setShowFeedback] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const { themeMode, toggleTheme } = useTheme();
  const {
    tenants,
    currentTenantId,
    currentTenant,
    selectTenant,
    setBootstrapData,
    clearTenant,
  } = useTenant();
  const { platformPermissions, tenantPermissions, setAuthData, clearAuth } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const guardRoute = async () => {
      try {
        const auth = getAuthClient();
        if (await auth.isAuthenticated()) {
          if (!cancelled) {
            // Fetch user info and bootstrap tenant data
            try {
              const bootstrap = await userApi.bootstrap();
              const myTenants = await tenantApi.listMyTenants();
              if (!cancelled) {
                const selectedTenantId = resolveBootstrapTenantId(
                  bootstrap.tenantStatus,
                  myTenants,
                  getStoredTenantId(),
                );
                const selectedTenant = myTenants.find(
                  (tenant) => tenant.tenantId === selectedTenantId,
                );
                setDisplayName(bootstrap.displayName ?? "");
                setAuthData({
                  platformPermissions: bootstrap.platformPermissions ?? [],
                  platformRoles: bootstrap.platformRoles ?? [],
                  tenantPermissions: selectedTenant?.permissionNames ?? [],
                  displayName: bootstrap.displayName ?? "",
                });
                setBootstrapData(
                  bootstrap.tenantStatus,
                  myTenants as TenantInfo[],
                  selectedTenantId,
                );

                // Handle tenant redirects
                if (bootstrap.tenantStatus === "NEEDS_ONBOARDING") {
                  const destination = pathname.startsWith("/platform")
                    ? null
                    : firstVisibleRoute(
                        filterMenuRegistry({
                          platformPermissions: bootstrap.platformPermissions ?? [],
                          tenantPermissions: [],
                        }),
                      ) ?? "/onboarding";
                  if (destination) {
                    setAuthStatus("tenant_redirect");
                    router.replace(destination);
                    return;
                  }
                }
                if (
                  bootstrap.tenantStatus === "MULTI_TENANT" &&
                  selectedTenantId === null &&
                  !pathname.startsWith("/platform")
                ) {
                  setAuthStatus("tenant_redirect");
                  router.replace("/tenant/select");
                  return;
                }
              }
            } catch {
              // Bootstrap failed — non-critical, continue with auth
            }

            setAuthStatus("authenticated");
          }
          return;
        }

        if (!cancelled) {
          setAuthStatus("redirecting");
        }
        await auth.login(getCurrentBrowserPath());
      } catch (err) {
        console.error("[admin auth] failed:", err);
        if (!cancelled) {
          setAuthStatus("redirecting");
          router.replace("/login");
        }
      }
    };

    void guardRoute();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, setBootstrapData, setAuthData]);

  const navItems = useMemo(
    () =>
      filterMenuRegistry({
        platformPermissions,
        tenantPermissions,
      }).map(toMenuItem),
    [platformPermissions, tenantPermissions],
  );

  const selectedKeys = useMemo(() => {
    const match = ALL_ROUTE_KEYS.filter(
      (key) => pathname === key || pathname.startsWith(key + "/"),
    ).sort((a, b) => b.length - a.length)[0];
    return match ? [match] : [];
  }, [pathname]);

  const openKeys = useMemo(() => {
    const keys: string[] = [];
    if (selectedKeys[0]?.startsWith("/transaction")) keys.push("/transaction");
    if (selectedKeys[0]?.startsWith("/products")) keys.push("/products-group");
    if (selectedKeys[0]?.startsWith("/partner")) keys.push("/partner");
    if (selectedKeys[0]?.startsWith("/platform")) keys.push("/platform");
    if (selectedKeys[0]?.startsWith("/tenant")) keys.push("/tenant-group");
    return keys;
  }, [selectedKeys]);

  const routeMeta = useMemo(
    () =>
      ROUTE_META.filter(
        (item) => pathname === item.key || pathname.startsWith(item.key + "/"),
      ).sort((a, b) => b.key.length - a.key.length)[0] ?? ROUTE_META[0],
    [pathname],
  );

  const zoneColor = useMemo(() => {
    if (pathname.startsWith("/inventory") || pathname.startsWith("/depots"))
      return "#10b981";
    if (pathname.startsWith("/transaction")) return "#6366f1";
    if (pathname.startsWith("/products")) return "#06b6d4";
    if (pathname.startsWith("/partner")) return "#f59e0b";
    if (pathname.startsWith("/platform")) return "#8b5cf6";
    return "#22c55e";
  }, [pathname]);

  return (
    <Layout
      className="af-admin-shell"
      style={{ "--page-accent": zoneColor } as React.CSSProperties}
    >
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        onBreakpoint={setCollapsed}
        width={236}
        collapsedWidth={76}
        className="af-sidebar"
        trigger={null}
      >
        <div className="af-brand">
          <div className="af-brand-mark">
            <Image
              src="/static/img/icon/favicon-no-background.png"
              alt="小算盘"
              width={40}
              height={40}
              priority
            />
          </div>
          {!collapsed && (
            <div className="af-brand-text">
              <strong>小算盘</strong>
              <span>运营中枢</span>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          theme={themeMode === "dark" ? "dark" : "light"}
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          items={navItems}
        />
      </Sider>

      <Layout>
        <Header className="af-admin-header">
          <div className="af-header-left">
            <button
              type="button"
              className="af-sidebar-toggle"
              aria-label={collapsed ? "展开导航" : "收起导航"}
              onClick={() => setCollapsed((value) => !value)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
            <div className="af-route-title">
              <strong>{routeMeta.title}</strong>
              <span>{routeMeta.subtitle}</span>
            </div>
          </div>

          <div className="af-header-right">
            {currentTenant && (
              <button
                type="button"
                className="af-tenant-switcher"
                aria-label="切换租户"
                onClick={() => setShowTenantModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "1px solid var(--border-color, #d9d9d9)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "inherit",
                  fontWeight: 500,
                }}
              >
                <SwapOutlined style={{ color: "var(--colorPrimary, #16a34a)" }} />
                <span>{currentTenant.displayName || currentTenant.name}</span>
              </button>
            )}
            <button
              type="button"
              className="af-feedback-btn"
              aria-label="提交反馈"
              onClick={() => setShowFeedback(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 12px",
                borderRadius: 6,
                border: "1px solid var(--border-color, #d9d9d9)",
                background: "transparent",
                cursor: "pointer",
                fontSize: 13,
                color: "inherit",
              }}
            >
              <QuestionCircleOutlined />
              <span>反馈</span>
            </button>
            <button
              type="button"
              className="af-theme-toggle"
              aria-label={
                themeMode === "dark" ? "切换到浅色模式" : "切换到深色模式"
              }
              onClick={toggleTheme}
            >
              {themeMode === "dark" ? <SunOutlined /> : <MoonOutlined />}
            </button>
            <div className="af-status-chip">实时同步</div>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "logout",
                    label: "退出登录",
                    icon: <LogoutOutlined />,
                    danger: true,
                    onClick: async () => {
                      const auth = getAuthClient();
                      clearTenant();
                      clearAuth();
                      await auth.logout();
                    },
                  },
                ],
              }}
              trigger={["click"]}
            >
              <div className="af-user-chip" style={{ cursor: "pointer" }}>
                <span className="af-user-avatar">
                  {displayName ? displayName.charAt(0).toUpperCase() : "?"}
                </span>
                <span>{displayName || "加载中..."}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content className="af-admin-content">
          {authStatus === "authenticated" ? (
            children
          ) : (
            <div className="af-admin-auth-loading" role="status">
              <div className="af-loader-card">
                <div className="af-loader-ring" />
                <span className="af-loader-text">
                  {authStatus === "redirecting"
                    ? "正在前往身份认证..."
                    : authStatus === "tenant_redirect"
                      ? "正在准备租户环境..."
                      : "正在检查登录状态..."}
                </span>
              </div>
            </div>
          )}
        </Content>

        <Footer className="af-admin-footer">小算盘业务指挥台 ©2026</Footer>
      </Layout>

      <FeedbackModal
        open={showFeedback}
        onClose={() => setShowFeedback(false)}
      />

      <Modal
        open={showTenantModal}
        title="切换租户"
        onCancel={() => setShowTenantModal(false)}
        footer={null}
        width={420}
        destroyOnHidden
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {tenants.map((t) => {
            const isCurrent = t.tenantId === currentTenantId;
            return (
              <button
                key={t.tenantId}
                type="button"
                onClick={() => {
                  if (!isCurrent) {
                    selectTenant(t.tenantId);
                    window.location.reload();
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: isCurrent
                    ? "1.5px solid var(--colorPrimary, #16a34a)"
                    : "1px solid var(--border-color, #d9d9d9)",
                  background: isCurrent
                    ? "rgba(22, 163, 74, 0.06)"
                    : "transparent",
                  cursor: isCurrent ? "default" : "pointer",
                  textAlign: "left",
                  fontSize: 14,
                  color: "inherit",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.borderColor = "var(--colorPrimary, #16a34a)";
                    e.currentTarget.style.background = "rgba(22, 163, 74, 0.04)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.borderColor = "var(--border-color, #d9d9d9)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(22, 163, 74, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#16a34a",
                    fontWeight: 700,
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {(t.displayName || t.name).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{t.displayName || t.name}</div>
                  {t.roleNames.length > 0 && (
                    <div style={{ fontSize: 12, color: "var(--colorTextSecondary, #666)", marginTop: 2 }}>
                      {t.roleNames.join(", ")}
                    </div>
                  )}
                </div>
                {isCurrent && <Tag color="success">当前</Tag>}
              </button>
            );
          })}
        </div>
      </Modal>
    </Layout>
  );
}
