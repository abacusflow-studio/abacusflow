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
          className="flex items-center gap-2 px-4 py-2.5 cursor-pointer text-sm text-gray-800 rounded-md mx-2 hover:bg-blue-50 transition-colors"
        >
          <span>{item.icon}</span>
          {!collapsed && <span className="flex-1">{item.label}</span>}
          {!collapsed && <span className="text-[10px]">{open ? "▼" : "▶"}</span>}
        </div>
        {open && !collapsed && (
          <div className="pl-4">
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
      className={`flex items-center gap-2 px-4 py-2.5 text-sm no-underline rounded-md mx-2 transition-all ${
        isActive
          ? "text-blue-500 bg-blue-50 font-semibold"
          : "text-gray-800 hover:bg-gray-100"
      }`}
    >
      <span>{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? "w-20" : "w-50";

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 ${sidebarWidth} bg-[#ebedef] overflow-y-auto transition-all z-[101] flex flex-col`}>
        <div className="h-12 mx-4 my-3 flex items-center gap-2 px-3">
          <span className="text-2xl">🧮</span>
          {!collapsed && (
            <span className="text-lg font-semibold text-gray-800 whitespace-nowrap">小算盘</span>
          )}
        </div>
        <nav className="flex-1 pt-2">
          {NAV_ITEMS.map((item) => (
            <MenuItem key={item.key} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className={`flex-1 ${collapsed ? "ml-20" : "ml-50"} transition-all`}>
        {/* Header */}
        <header className="fixed top-0 right-0 h-16 bg-[#fdfdfc] flex justify-between items-center px-6 z-[100] border-b border-gray-100" style={{ left: collapsed ? 80 : 200 }}>
          <div className="cursor-pointer text-lg" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "☰" : "✕"}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span>超级管理员</span>
          </div>
        </header>

        {/* Content */}
        <main className="pt-20 px-6 pb-6 min-h-[calc(100vh-64px)]">
          {children}
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-gray-400 text-sm">
          abacusflow ©2025
        </footer>
      </div>
    </div>
  );
}
