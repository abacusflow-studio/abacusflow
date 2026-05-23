"use client";

import React, { useEffect, useState } from "react";
import { Button, Typography, Flex, Spin, Card, Row, Col } from "antd";
import {
  ShoppingOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  ShopOutlined,
  UserOutlined,
  BankOutlined,
  HomeOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  productApi,
  inventoryApi,
  transactionApi,
  partnerApi,
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
  { key: "productCount", label: "产品总数", icon: <ShoppingOutlined />, color: COLORS.primary },
  { key: "inventoryCount", label: "库存记录", icon: <InboxOutlined />, color: COLORS.success },
  { key: "purchaseOrderCount", label: "采购单", icon: <ShoppingCartOutlined />, color: COLORS.warning },
  { key: "saleOrderCount", label: "销售单", icon: <ShopOutlined />, color: "#722ed1" },
  { key: "customerCount", label: "客户数", icon: <UserOutlined />, color: COLORS.info },
  { key: "supplierCount", label: "供应商", icon: <BankOutlined />, color: "#eb2f96" },
  { key: "depotCount", label: "储存点", icon: <HomeOutlined />, color: "#8c8c8c" },
  { key: "lowStockCount", label: "低库存预警", icon: <WarningOutlined />, color: COLORS.danger },
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
        transactionApi.listBasicPurchaseOrdersPage({ pageIndex: 1, pageSize: 1 }),
        transactionApi.listBasicSaleOrdersPage({ pageIndex: 1, pageSize: 1 }),
        partnerApi.listBasicCustomersPage({ pageIndex: 1, pageSize: 1 }),
        partnerApi.listBasicSuppliersPage({ pageIndex: 1, pageSize: 1 }),
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
      <Typography.Title level={4} style={{ margin: "0 0 16px" }}>仪表盘</Typography.Title>
      {loading ? (
        <Flex justify="center" align="center" style={{ padding: "4rem 0" }}>
          <Spin size="large" />
        </Flex>
      ) : stats ? (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {STAT_CARDS.map((card) => (
              <Col key={card.key} xs={24} sm={12} md={8} lg={6}>
                <Card hoverable>
                  <Flex align="center" gap={12}>
                    <span style={{ fontSize: 32, color: card.color }}>{card.icon}</span>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>
                        {stats[card.key]}
                      </div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>{card.label}</div>
                    </div>
                  </Flex>
                </Card>
              </Col>
            ))}
          </Row>
          <Card>
            <Typography.Text strong style={{ display: "block", marginBottom: 12 }}>快捷操作</Typography.Text>
            <Flex wrap="wrap" gap={12}>
              <Button type="primary">新增采购单</Button>
              <Button type="primary">新增销售单</Button>
              <Button>查看低库存</Button>
            </Flex>
          </Card>
        </>
      ) : null}
    </div>
  );
}
