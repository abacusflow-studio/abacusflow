"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import {
  AppstoreOutlined,
  BankOutlined,
  CalculatorOutlined,
  DashboardOutlined,
  HomeOutlined,
  InboxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SunOutlined,
  TeamOutlined,
  TransactionOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTheme } from "../../components/providers";

const { Sider, Header, Content, Footer } = Layout;

type MenuItemType = Required<MenuProps>["items"][number];

const NAV_ITEMS: MenuItemType[] = [
  {
    key: "/dashboard",
    label: <Link href="/dashboard">仪表盘</Link>,
    icon: <DashboardOutlined />,
  },
  {
    key: "/user",
    label: <Link href="/user">用户管理</Link>,
    icon: <UserOutlined />,
  },
  {
    key: "/inventory",
    label: <Link href="/inventory">库存管理</Link>,
    icon: <InboxOutlined />,
  },
  {
    key: "/transaction",
    label: "交易管理",
    icon: <TransactionOutlined />,
    children: [
      {
        key: "/transaction/purchase-order",
        label: <Link href="/transaction/purchase-order">采购单管理</Link>,
        icon: <ShoppingCartOutlined />,
      },
      {
        key: "/transaction/sale-order",
        label: <Link href="/transaction/sale-order">销售单管理</Link>,
        icon: <ShopOutlined />,
      },
    ],
  },
  {
    key: "/products-group",
    label: "产品中心",
    icon: <ShoppingOutlined />,
    children: [
      {
        key: "/products",
        label: <Link href="/products">产品管理</Link>,
        icon: <AppstoreOutlined />,
      },
      {
        key: "/products/category",
        label: <Link href="/products/category">产品类别管理</Link>,
        icon: <AppstoreOutlined />,
      },
    ],
  },
  {
    key: "/partner",
    label: "合作伙伴",
    icon: <TeamOutlined />,
    children: [
      {
        key: "/partner/customer",
        label: <Link href="/partner/customer">客户管理</Link>,
        icon: <UserOutlined />,
      },
      {
        key: "/partner/supplier",
        label: <Link href="/partner/supplier">供应商管理</Link>,
        icon: <BankOutlined />,
      },
    ],
  },
  {
    key: "/depots",
    label: <Link href="/depots">储存点管理</Link>,
    icon: <HomeOutlined />,
  },
];

const ROUTE_META = [
  { key: "/dashboard", title: "业务仪表盘", subtitle: "全链路库存与订单信号" },
  { key: "/user", title: "用户管理", subtitle: "团队身份与权限入口" },
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
];

const ALL_ROUTE_KEYS = ROUTE_META.map((item) => item.key);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { themeMode, toggleTheme } = useTheme();

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
            <CalculatorOutlined />
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
          items={NAV_ITEMS}
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
            <div className="af-user-chip">
              <span className="af-user-avatar">管</span>
              <span>超级管理员</span>
            </div>
          </div>
        </Header>

        <Content className="af-admin-content">{children}</Content>

        <Footer className="af-admin-footer">小算盘业务指挥台 ©2026</Footer>
      </Layout>
    </Layout>
  );
}
