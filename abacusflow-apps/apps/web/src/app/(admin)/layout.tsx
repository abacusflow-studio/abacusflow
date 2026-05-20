"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  key: string;
  label: string;
  icon: string;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { key: "/dashboard", label: "仪表盘", icon: "📊" },
  { key: "/user", label: "用户管理", icon: "👤" },
  { key: "/inventory", label: "库存管理", icon: "📦" },
  {
    key: "/transaction",
    label: "交易管理",
    icon: "💱",
    children: [
      { key: "/transaction/purchase-order", label: "采购单管理", icon: "🛒" },
      { key: "/transaction/sale-order", label: "销售单管理", icon: "🛍️" },
    ],
  },
  {
    key: "/product",
    label: "产品中心",
    icon: "📋",
    children: [
      { key: "/products", label: "产品管理", icon: "📥" },
    ],
  },
  {
    key: "/partner",
    label: "合作伙伴",
    icon: "🤝",
    children: [
      { key: "/partner/customer", label: "客户管理", icon: "👤" },
      { key: "/partner/supplier", label: "供应商管理", icon: "🏪" },
    ],
  },
  { key: "/depots", label: "储存点管理", icon: "🏠" },
];

function MenuItem({ item, pathname, collapsed }: { item: NavItem; pathname: string; collapsed: boolean }) {
  const isActive = pathname === item.key || pathname.startsWith(item.key + "/");
  const [open, setOpen] = useState(isActive);

  if (item.children) {
    return (
      <div>
        <div
          onClick={() => setOpen(!open)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            cursor: "pointer",
            fontSize: 14,
            color: "#333",
            borderRadius: 6,
            margin: "2px 8px",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e6f4ff")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <span>{item.icon}</span>
          {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
          {!collapsed && <span style={{ fontSize: 10 }}>{open ? "▼" : "▶"}</span>}
        </div>
        {open && !collapsed && (
          <div style={{ paddingLeft: 16 }}>
            {item.children.map((child) => (
              <MenuItem key={child.key} item={child} pathname={pathname} collapsed={collapsed} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.key}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        fontSize: 14,
        color: isActive ? "#1677ff" : "#333",
        backgroundColor: isActive ? "#e6f4ff" : "transparent",
        borderRadius: 6,
        margin: "2px 8px",
        textDecoration: "none",
        fontWeight: isActive ? 600 : 400,
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "#f5f5f5";
      }}
      onMouseLeave={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <span>{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 80 : 200;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: sidebarWidth,
          backgroundColor: "#ebedef",
          overflowY: "auto",
          transition: "width 0.2s",
          zIndex: 101,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            height: 48,
            margin: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 12px",
          }}
        >
          <span style={{ fontSize: 24 }}>🧮</span>
          {!collapsed && (
            <span style={{ fontSize: 18, fontWeight: 600, color: "#333", whiteSpace: "nowrap" }}>
              小算盘
            </span>
          )}
        </div>
        <nav style={{ flex: 1, paddingTop: 8 }}>
          {NAV_ITEMS.map((item) => (
            <MenuItem key={item.key} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: sidebarWidth, transition: "margin-left 0.2s" }}>
        {/* Header */}
        <header
          style={{
            position: "fixed",
            top: 0,
            left: sidebarWidth,
            right: 0,
            height: 64,
            backgroundColor: "#fdfdfc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 24px",
            zIndex: 100,
            transition: "left 0.2s",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div style={{ cursor: "pointer", fontSize: 18 }} onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "☰" : "✕"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 14 }}>
            <span>超级管理员</span>
          </div>
        </header>

        {/* Content */}
        <main style={{ padding: "80px 24px 24px", minHeight: "calc(100vh - 64px)" }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{ textAlign: "center", padding: "16px 0", color: "#999", fontSize: 13 }}>
          abacusflow ©2025
        </footer>
      </div>
    </div>
  );
}
