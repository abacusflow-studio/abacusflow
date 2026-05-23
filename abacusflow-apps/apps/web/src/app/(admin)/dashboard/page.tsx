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
  {
    key: "inventoryCount",
    label: "库存记录",
    icon: "📦",
    color: COLORS.success,
  },
  {
    key: "purchaseOrderCount",
    label: "采购单",
    icon: "🛒",
    color: COLORS.warning,
  },
  { key: "saleOrderCount", label: "销售单", icon: "🛍️", color: "#722ed1" },
  { key: "customerCount", label: "客户数", icon: "👤", color: COLORS.info },
  { key: "supplierCount", label: "供应商", icon: "🏪", color: "#eb2f96" },
  { key: "depotCount", label: "储存点", icon: "🏠", color: "#8c8c8c" },
  {
    key: "lowStockCount",
    label: "低库存预警",
    icon: "⚠️",
    color: COLORS.danger,
  },
] as const;

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [
        products,
        inventories,
        purchaseOrders,
        saleOrders,
        customers,
        suppliers,
        depots,
      ] = await Promise.all([
        productApi.listBasicProductsPage({ pageIndex: 1, pageSize: 1 }),
        inventoryApi.listBasicInventoriesPage({ pageIndex: 1, pageSize: 100 }),
        transactionApi.listPurchaseOrdersPage({ pageIndex: 1, pageSize: 1 }),
        transactionApi.listSaleOrdersPage({ pageIndex: 1, pageSize: 1 }),
        customerApi.listCustomersPage({ pageIndex: 1, pageSize: 1 }),
        supplierApi.listSuppliersPage({ pageIndex: 1, pageSize: 1 }),
        depotApi.listBasicDepots(),
      ]);

      const lowStock = inventories.content.filter(
        (i) => i.safetyStock !== undefined && i.quantity < i.safetyStock,
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
        <div className="text-center py-16 text-gray-400">加载中...</div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mb-6">
            {STAT_CARDS.map((card) => (
              <div key={card.key} className="card flex items-center gap-3">
                <span className="text-3xl">{card.icon}</span>
                <div>
                  <div
                    className="text-2xl font-bold"
                    style={{ color: card.color }}
                  >
                    {stats[card.key]}
                  </div>
                  <div className="text-xs text-gray-400">{card.label}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 className="text-sm font-medium mb-4">快捷操作</h3>
            <div className="flex flex-wrap gap-3">
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
