"use client";

import React from "react";
import {
  Descriptions,
  Flex,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  dateToFormattedString,
  translateOrderStatus,
  STATUS_COLORS,
  type OrderStatus,
} from "@abacusflow/utils";
import type { OrderItem } from "@abacusflow/core";
import type { Order } from "./order-list-types";
import {
  formatTimestamp,
  getOrderItems,
  getPartnerValue,
  getTotalAmount,
} from "./order-list-types";

interface OrderDetailModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  order: Order | null;
  orderType: "purchase" | "sale";
  orderLabel: string;
  partnerLabel: string;
  partnerKey: "supplierName" | "customerName";
}

export function OrderDetailModal({
  open,
  onClose,
  loading,
  order,
  orderType,
  orderLabel,
  partnerLabel,
  partnerKey,
}: OrderDetailModalProps) {
  const itemColumns = buildItemColumns(orderType);

  return (
    <Modal
      open={open}
      title={`${orderLabel}单详情`}
      onCancel={onClose}
      footer={null}
      width={760}
      destroyOnHidden
    >
      {loading ? (
        <Flex justify="center" style={{ padding: "2rem 0" }}>
          <Spin />
        </Flex>
      ) : order ? (
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          <Descriptions column={1} size="small" labelStyle={{ width: 100 }}>
            <Descriptions.Item label="订单编号">
              {order.orderNo}
            </Descriptions.Item>
            <Descriptions.Item label="订单日期">
              {dateToFormattedString(order.orderDate)}
            </Descriptions.Item>
            <Descriptions.Item label={partnerLabel}>
              {getPartnerValue(order, partnerKey, orderType) ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <OrderStatusTag status={order.status} />
            </Descriptions.Item>
            <Descriptions.Item label="总金额">
              {getTotalAmount(order)}
            </Descriptions.Item>
            <Descriptions.Item label="备注">
              {(order as unknown as Record<string, unknown>)["note"] as string ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {formatTimestamp(order.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {formatTimestamp(
                (order as unknown as Record<string, unknown>)["updatedAt"] as
                  | string
                  | number,
              )}
            </Descriptions.Item>
          </Descriptions>
          <div>
            <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
              订单明细
            </Typography.Text>
            <Table<OrderItem>
              columns={itemColumns}
              dataSource={getOrderItems(order)}
              pagination={false}
              size="small"
              rowKey={(item) =>
                item.id?.toString() ??
                `${item.productId ?? item.inventoryUnitId ?? "item"}-${item.quantity}-${item.unitPrice}`
              }
            />
          </div>
        </Space>
      ) : null}
    </Modal>
  );
}

function OrderStatusTag({ status }: { status: OrderStatus }) {
  const colors = STATUS_COLORS[status] ?? {
    bg: "#f0f0f0",
    color: "#000",
  };
  return (
    <Tag style={{ backgroundColor: colors.bg, color: colors.color }}>
      {translateOrderStatus(status)}
    </Tag>
  );
}

function buildItemColumns(orderType: "purchase" | "sale"): ColumnsType<OrderItem> {
  return [
    {
      title: orderType === "purchase" ? "产品" : "库存单元",
      key: "productName",
      render: (_, record) =>
        record.productName ??
        record.inventoryUnitTitle ??
        record.title ??
        (record.productId ? `产品 #${record.productId}` : undefined) ??
        (record.inventoryUnitId
          ? `库存单元 #${record.inventoryUnitId}`
          : "-"),
    },
    { title: "数量", dataIndex: "quantity", key: "quantity" },
    {
      title: "单价",
      key: "unitPrice",
      render: (_, record) => record.unitPrice?.toLocaleString("zh-CN") ?? "-",
    },
    ...(orderType === "sale"
      ? [
          {
            title: "折扣价",
            key: "discountedPrice",
            render: (_: unknown, record: OrderItem) =>
              record.discountedPrice?.toLocaleString("zh-CN") ?? "-",
          } as const,
        ]
      : []),
    {
      title: "小计",
      key: "subtotal",
      render: (_, record) => record.subtotal?.toLocaleString("zh-CN") ?? "-",
    },
    { title: "序列号", dataIndex: "serialNumber", key: "serialNumber" },
  ];
}
