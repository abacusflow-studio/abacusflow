"use client";

import React, { useEffect, useState } from "react";
import { PageHeader, Button } from "@abacusflow/ui";
import {
  productApi,
  inventoryApi,
  transactionApi,
  customerApi,
  supplierApi,
  depotApi,
} from "@abacusflow/core";
import { COLORS } from "@abacusflow/utils";

interface DashboardStats {
  productCount: number;
  inventoryCount: number;
  purchaseOrderCount: number;
  saleOrderCount: number;
  customerCount: number;
  supplierCount: number;
  depotCount: number;
  lowStockCount: number;
}

const STAT_CARDS = [
  { key: "productCount", label: "产品总数", icon: "📋", color: COLORS.primary },
  { key: "inventoryCount", label: "库存记录", icon: "📦", color: COLORS.success },
  { key: "purchaseOrderCount", label: "采购单", icon: "🛒", color: COLORS.warning },
  { key: "saleOrderCount", label: "销售单", icon: "🛍️", color: "#722ed1" },
  { key: "customerCount", label: "客户数", icon: "👤", color: COLORS.info },
  { key: "supplierCount", label: "供应商", icon: "🏪", color: "#eb2f96" },
  { key: "depotCount", label: "储存点", icon: "🏠", color: "#8c8c8c" },
  { key: "lowStockCount", label: "低库存预警", icon: "⚠️", color: COLORS.danger },
] as const;

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [products, inventories, purchaseOrders, saleOrders, customers, suppliers, depots] =
        await Promise.all([
          productApi.listBasicProductsPage({ pageIndex: 1, pageSize: 1 }),
          inventoryApi.listInventoriesPage({ pageIndex: 1, pageSize: 100 }),
          transactionApi.listPurchaseOrdersPage({ pageIndex: 1, pageSize: 1 }),
          transactionApi.listSaleOrdersPage({ pageIndex: 1, pageSize: 1 }),
          customerApi.listCustomersPage({ pageIndex: 1, pageSize: 1 }),
          supplierApi.listSuppliersPage({ pageIndex: 1, pageSize: 1 }),
          depotApi.listBasicDepots(),
        ]);

      const lowStock = inventories.content.filter(
        (i) => i.safetyStock && i.quantity < i.safetyStock
      ).length;

      setStats({
        productCount: products.totalElements,
        inventoryCount: inventories.totalElements,
        purchaseOrderCount: purchaseOrders.totalElements,
        saleOrderCount: saleOrders.totalElements,
        customerCount: customers.totalElements,
        supplierCount: suppliers.totalElements,
        depotCount: depots.length,
        lowStockCount: lowStock,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="仪表盘" />
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#999" }}>加载中...</div>
      ) : stats ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {STAT_CARDS.map((card) => (
              <div
                key={card.key}
                className="card"
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <span style={{ fontSize: 28 }}>{card.icon}</span>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>
                    {stats[card.key]}
                  </div>
                  <div style={{ fontSize: 12, color: "#999" }}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: 15 }}>快捷操作</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Button type="primary" label="新增采购单" onClick={() => {}} />
              <Button type="primary" label="新增销售单" onClick={() => {}} />
              <Button label="查看低库存" onClick={() => {}} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
