"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  InboxOutlined,
  TransactionOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  TeamOutlined,
  BankOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";

const { Sider, Header, Content, Footer } = Layout;

type MenuItemType = Required<MenuProps>["items"][number];

const NAV_ITEMS: MenuItemType[] = [
  { key: "/dashboard", label: <Link href="/dashboard">仪表盘</Link>, icon: <DashboardOutlined /> },
  { key: "/user", label: <Link href="/user">用户管理</Link>, icon: <UserOutlined /> },
  { key: "/inventory", label: <Link href="/inventory">库存管理</Link>, icon: <InboxOutlined /> },
  {
    key: "/transaction",
    label: "交易管理",
    icon: <TransactionOutlined />,
    children: [
      { key: "/transaction/purchase-order", label: <Link href="/transaction/purchase-order">采购单管理</Link>, icon: <ShoppingCartOutlined /> },
      { key: "/transaction/sale-order", label: <Link href="/transaction/sale-order">销售单管理</Link>, icon: <ShopOutlined /> },
    ],
  },
  {
    key: "/products-group",
    label: "产品中心",
    icon: <ShoppingOutlined />,
    children: [
      { key: "/products", label: <Link href="/products">产品管理</Link>, icon: <AppstoreOutlined /> },
      { key: "/products/category", label: <Link href="/products/category">产品类别管理</Link>, icon: <AppstoreOutlined /> },
    ],
  },
  {
    key: "/partner",
    label: "合作伙伴",
    icon: <TeamOutlined />,
    children: [
      { key: "/partner/customer", label: <Link href="/partner/customer">客户管理</Link>, icon: <UserOutlined /> },
      { key: "/partner/supplier", label: <Link href="/partner/supplier">供应商管理</Link>, icon: <BankOutlined /> },
    ],
  },
  { key: "/depots", label: <Link href="/depots">储存点管理</Link>, icon: <HomeOutlined /> },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const selectedKeys = useMemo(() => {
    // Find the most specific matching key
    const allKeys = [
      "/dashboard", "/user", "/inventory",
      "/transaction/purchase-order", "/transaction/sale-order",
      "/products", "/products/category",
      "/partner/customer", "/partner/supplier",
      "/depots",
    ];
    const match = allKeys
      .filter((k) => pathname === k || pathname.startsWith(k + "/"))
      .sort((a, b) => b.length - a.length)[0];
    return match ? [match] : [];
  }, [pathname]);

  const openKeys = useMemo(() => {
    const keys: string[] = [];
    if (selectedKeys[0]?.startsWith("/transaction")) keys.push("/transaction");
    if (selectedKeys[0]?.startsWith("/products")) keys.push("/products-group");
    if (selectedKeys[0]?.startsWith("/partner")) keys.push("/partner");
    return keys;
  }, [selectedKeys]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={200}
        collapsedWidth={80}
        style={{ background: "#ebedef" }}
        trigger={null}
      >
        <div style={{ height: 48, margin: "12px 16px", display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
          <span style={{ fontSize: 24 }}>🧮</span>
          {!collapsed && (
            <span style={{ fontSize: 18, fontWeight: 600, color: "#1f1f1f", whiteSpace: "nowrap" }}>
              小算盘
            </span>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          defaultOpenKeys={openKeys}
          items={NAV_ITEMS}
          style={{ background: "transparent", borderRight: 0 }}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: "#fdfdfc",
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #f0f0f0",
          height: 64,
          lineHeight: "64px",
        }}>
          <div
            style={{ cursor: "pointer", fontSize: 18 }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>
          <span style={{ fontSize: 14 }}>超级管理员</span>
        </Header>

        <Content style={{ padding: "24px 24px 24px", minHeight: "calc(100vh - 64px)" }}>
          {children}
        </Content>

        <Footer style={{ textAlign: "center", color: "#8c8c8c", fontSize: 14 }}>
          abacusflow ©2025
        </Footer>
      </Layout>
    </Layout>
  );
}
