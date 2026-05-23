"use client";

import React, { useState } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  Select,
  Form,
  Typography,
  Flex,
  Tag,
  App,
  Space,
  Descriptions,
  Card,
  Spin,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { usePaginatedList } from "../hooks/use-paginated-list";
import {
  dateToFormattedString,
  timestampToLocaleString,
  translateInventoryUnitType,
  translateOrderStatus,
  STATUS_COLORS,
  type OrderStatus,
} from "@abacusflow/utils";
import type {
  OrderItem,
  PageResponse,
  PurchaseOrder,
  BasicPurchaseOrder,
  SaleOrder,
  BasicSaleOrder,
  SelectableProduct,
} from "@abacusflow/core";
import {
  inventoryApi,
  partnerApi,
  productApi,
  transactionApi,
} from "@abacusflow/core";

type Order = PurchaseOrder | BasicPurchaseOrder | SaleOrder | BasicSaleOrder;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPageResponse = PageResponse<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyParams = Record<string, any>;
type SelectOption = { label: string; value: string | number };

interface OrderListPageProps {
  title: string;
  orderType: "purchase" | "sale";
  partnerLabel: string;
  partnerKey: "supplierName" | "customerName";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listFn: (params: any) => Promise<AnyPageResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDetailFn: (id: number) => Promise<any>;
  completeFn: (id: number) => Promise<void>;
  cancelFn: (id: number) => Promise<void>;
  reverseFn: (id: number) => Promise<void>;
}

interface OrderItemForm {
  itemId: string;
  quantity: string;
  unitPrice: string;
  serialNumber: string;
  discountFactor: string;
}

interface OrderForm {
  partnerId: string;
  orderDate: string;
  note: string;
  items: OrderItemForm[];
}

const ORDER_STATUS_OPTIONS: { label: string; value: OrderStatus }[] = [
  { label: "进行中", value: "pending" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "canceled" },
  { label: "已撤回", value: "reversed" },
];

const emptyItem = (): OrderItemForm => ({
  itemId: "",
  quantity: "1",
  unitPrice: "",
  serialNumber: "",
  discountFactor: "100",
});

const emptyForm = (): OrderForm => ({
  partnerId: "",
  orderDate: new Date().toISOString().slice(0, 10),
  note: "",
  items: [emptyItem()],
});

export function OrderListPage({
  title,
  orderType,
  partnerLabel,
  partnerKey,
  listFn,
  getDetailFn,
  completeFn,
  cancelFn,
  reverseFn,
}: OrderListPageProps) {
  const { message, modal } = App.useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [partnerOptions, setPartnerOptions] = useState<SelectOption[]>([]);
  const [itemOptions, setItemOptions] = useState<SelectOption[]>([]);
  const [products, setProducts] = useState<SelectableProduct[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const defaultFilters: Partial<AnyParams> =
    orderType === "purchase"
      ? {
          orderNo: undefined,
          supplierName: undefined,
          status: undefined,
          productName: undefined,
          serialNumber: undefined,
          orderDate: undefined,
        }
      : {
          orderNo: undefined,
          customerName: undefined,
          status: undefined,
          inventoryUnitName: undefined,
          orderDate: undefined,
        };

  const {
    data, loading, pageIndex, total, filters,
    updateFilter, setPageIndex, refresh, handleSearch, handleReset,
  } = usePaginatedList<Order, AnyParams>({
    fetchFn: listFn,
    defaultFilters,
  });

  const orderLabel = orderType === "purchase" ? "采购" : "销售";
  const itemLabel = orderType === "purchase" ? "产品" : "库存单元";
  const partnerFilterKey = orderType === "purchase" ? "supplierName" : "customerName";

  const openCreate = async () => {
    setForm(emptyForm());
    setErrors({});
    setShowForm(true);
    setFormLoading(true);
    try {
      if (orderType === "purchase") {
        const [suppliers, selectableProducts] = await Promise.all([
          partnerApi.listSelectableSuppliers(),
          productApi.listSelectableProducts(),
        ]);
        setProducts(selectableProducts);
        setPartnerOptions(
          suppliers.map((supplier) => ({
            label: supplier.name,
            value: supplier.id,
          })),
        );
        setItemOptions(
          selectableProducts.map((product) => ({
            label: `${product.name} / ${product.barcode}`,
            value: product.id,
          })),
        );
      } else {
        const [customers, selectableInventoryUnits] = await Promise.all([
          partnerApi.listSelectableCustomers(),
          inventoryApi.listSelectableInventoryUnits({ statuses: ["normal", "reversed"] }),
        ]);
        setPartnerOptions(
          customers.map((customer) => ({
            label: customer.name,
            value: customer.id,
          })),
        );
        setItemOptions(
          selectableInventoryUnits.map((unit) => ({
            label: `${unit.title} / ${translateInventoryUnitType(unit.type)}`,
            value: unit.id,
          })),
        );
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载表单数据失败");
    } finally {
      setFormLoading(false);
    }
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await getDetailFn(id);
      setDetailItem(item);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateItem = (index: number, patch: Partial<OrderItemForm>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const addOrderItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeOrderItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!form.partnerId) nextErrors.partnerId = `请选择${partnerLabel}`;
    if (!form.orderDate) nextErrors.orderDate = "请选择订单日期";
    if (form.items.length === 0) nextErrors.items = "请至少添加一条明细";

    form.items.forEach((item, index) => {
      if (!item.itemId) nextErrors[`item-${index}`] = `请选择${itemLabel}`;
      if (!item.quantity || Number(item.quantity) <= 0) {
        nextErrors[`quantity-${index}`] = "请输入大于 0 的数量";
      }
      if (!item.unitPrice || Number(item.unitPrice) < 0) {
        nextErrors[`unitPrice-${index}`] = "请输入不小于 0 的单价";
      }
      if (orderType === "sale") {
        const discount = Number(item.discountFactor || "100");
        if (Number.isNaN(discount) || discount < 0 || discount > 100) {
          nextErrors[`discountFactor-${index}`] = "折扣率需在 0 到 100 之间";
        }
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (orderType === "purchase") {
        await transactionApi.addPurchaseOrder({
          createPurchaseOrderInput: {
            supplierId: Number(form.partnerId),
            orderDate: new Date(form.orderDate),
            note: form.note || undefined,
            orderItems: form.items.map((item) => ({
              productId: Number(item.itemId),
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              serialNumber: item.serialNumber || undefined,
            })),
          },
        });
      } else {
        await transactionApi.addSaleOrder({
          createSaleOrderInput: {
            customerId: Number(form.partnerId),
            orderDate: new Date(form.orderDate),
            note: form.note || undefined,
            orderItems: form.items.map((item) => ({
              inventoryUnitId: Number(item.itemId),
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              discountFactor: item.discountFactor ? Number(item.discountFactor) / 100 : 1,
            })),
          },
        });
      }
      message.success(`新增${orderLabel}单成功`);
      setShowForm(false);
      refresh();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "新增失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: number, action: "complete" | "cancel" | "reverse") => {
    const labels = { complete: "完成", cancel: "取消", reverse: "撤回" };
    modal.confirm({
      title: "确认操作",
      content: `确定${labels[action]}该${orderLabel}单？`,
      onOk: async () => {
        try {
          if (action === "complete") await completeFn(id);
          if (action === "cancel") await cancelFn(id);
          if (action === "reverse") await reverseFn(id);
          message.success(`${labels[action]}成功`);
          refresh();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "操作失败");
        }
      },
    });
  };

  const columns: ColumnsType<Order> = [
    { title: "订单编号", dataIndex: "orderNo", key: "orderNo" },
    {
      title: "订单日期",
      key: "orderDate",
      render: (_, record) => dateToFormattedString(record.orderDate),
    },
    {
      title: partnerLabel,
      key: partnerKey,
      render: (_, record) =>
        ((record as unknown as Record<string, unknown>)[partnerKey] as string) ?? "-",
    },
    {
      title: "状态",
      key: "status",
      render: (_, record) => {
        const colors = STATUS_COLORS[record.status] || { bg: "#f0f0f0", color: "#000" };
        return <Tag style={{ backgroundColor: colors.bg, color: colors.color, borderColor: `${colors.color}30` }}>{translateOrderStatus(record.status)}</Tag>;
      },
    },
    {
      title: "总金额",
      key: "totalAmount",
      render: (_, record) => ((record as unknown as Record<string, unknown>)["totalAmount"] as number)?.toLocaleString("zh-CN") ?? "-",
    },
    { title: "总数量", dataIndex: "totalQuantity", key: "totalQuantity" },
    { title: "明细数", dataIndex: "itemCount", key: "itemCount" },
    {
      title: "自动完成日期",
      key: "autoCompleteDate",
      render: (_, record) => dateToFormattedString((record as unknown as Record<string, unknown>)["autoCompleteDate"] as Date | undefined),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openDetail(record.id)}>详情</Button>
          {record.status === "pending" && (
            <>
              <Button type="link" size="small" onClick={() => handleAction(record.id, "complete")}>完成</Button>
              <Button type="link" size="small" onClick={() => handleAction(record.id, "cancel")}>取消</Button>
            </>
          )}
          {record.status === "completed" && (
            <Button type="link" size="small" onClick={() => handleAction(record.id, "reverse")}>撤回</Button>
          )}
        </Space>
      ),
    },
  ];

  const itemColumns: ColumnsType<OrderItem> = [
    {
      title: orderType === "purchase" ? "产品" : "库存单元",
      key: "productName",
      render: (_, record) =>
        record.productName ??
        record.title ??
        (record.productId ? `产品 #${record.productId}` : undefined) ??
        (record.inventoryUnitId ? `库存单元 #${record.inventoryUnitId}` : "-"),
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

  const getOrderItems = (order: Order | null): OrderItem[] => {
    if (!order) return [];
    const o = order as unknown as Record<string, unknown>;
    return (o["orderItems"] as OrderItem[]) ?? (o["items"] as OrderItem[]) ?? [];
  };

  const getTotalAmount = (order: Order): string => {
    const o = order as unknown as Record<string, unknown>;
    const total =
      (o["totalAmount"] as number | undefined) ??
      getOrderItems(order).reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
    return total ? total.toLocaleString("zh-CN") : "-";
  };

  const getPartnerValue = (order: Order): string | number | undefined => {
    const value = (order as unknown as Record<string, unknown>)[partnerKey];
    if (typeof value === "string" && value) return value;
    if (orderType === "purchase" && "supplierId" in order) return order.supplierId;
    if (orderType === "sale" && "customerId" in order) return order.customerId;
    return undefined;
  };

  const formatTimestamp = (value?: string | number): string =>
    typeof value === "number" ? timestampToLocaleString(value) : value ?? "";

  const isAssetProduct = (productId: string) =>
    products.find((product) => String(product.id) === productId)?.type === "asset";

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>{`新增${orderLabel}单`}</Button>
      </Flex>

      <Card style={{ marginBottom: 16 }}>
        <Flex wrap="wrap" gap={12} align="flex-end">
          <div className="form-item">
            <label>订单编号</label>
            <Input
              value={filters.orderNo ?? ""}
              onChange={(e) => updateFilter("orderNo", e.target.value || undefined)}
              placeholder={`请输入${orderLabel}单号`}
            />
          </div>
          <div className="form-item">
            <label>订单日期</label>
            <Input
              type="date"
              value={filters.orderDate ?? ""}
              onChange={(e) => updateFilter("orderDate", e.target.value || undefined)}
            />
          </div>
          <div className="form-item">
            <label>{partnerLabel}</label>
            <Input
              value={(filters[partnerFilterKey] as string | undefined) ?? ""}
              onChange={(e) => updateFilter(partnerFilterKey, e.target.value || undefined)}
              placeholder={`请输入${partnerLabel}`}
            />
          </div>
          <div className="form-item">
            <label>状态</label>
            <Select
              value={filters.status ?? undefined}
              onChange={(val) => updateFilter("status", val)}
              placeholder="全部"
              allowClear
              style={{ width: 120 }}
              options={ORDER_STATUS_OPTIONS}
            />
          </div>
          {orderType === "purchase" ? (
            <>
              <div className="form-item">
                <label>产品名称</label>
                <Input
                  value={filters.productName ?? ""}
                  onChange={(e) => updateFilter("productName", e.target.value || undefined)}
                  placeholder="请输入产品名称"
                />
              </div>
              <div className="form-item">
                <label>序列号</label>
                <Input
                  value={filters.serialNumber ?? ""}
                  onChange={(e) => updateFilter("serialNumber", e.target.value || undefined)}
                  placeholder="请输入序列号"
                />
              </div>
            </>
          ) : (
            <div className="form-item">
              <label>库存单元</label>
              <Input
                value={filters.inventoryUnitName ?? ""}
                onChange={(e) => updateFilter("inventoryUnitName", e.target.value || undefined)}
                placeholder="请输入库存单元名"
              />
            </div>
          )}
          <Button type="primary" onClick={handleSearch}>搜索</Button>
          <Button onClick={handleReset}>重置</Button>
        </Flex>
      </Card>

      <Card>
        <Table<Order>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{
            current: pageIndex,
            pageSize: 10,
            total,
            onChange: setPageIndex,
            showTotal: (t) => `共 ${t} 条`,
            showSizeChanger: false,
          }}
        />
      </Card>

      <Modal
        open={showForm}
        title={`新增${orderLabel}单`}
        onCancel={() => setShowForm(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={760}
        destroyOnHidden
      >
        {formLoading ? (
          <Flex justify="center" style={{ padding: "2rem 0" }}><Spin /></Flex>
        ) : (
          <div style={{ marginTop: 16 }}>
            <Form.Item label={partnerLabel} required style={{ marginBottom: 12 }}>
              <Select
                value={form.partnerId || undefined}
                onChange={(val) => setForm({ ...form, partnerId: String(val) })}
                placeholder={`请选择${partnerLabel}`}
                options={partnerOptions}
                {...(errors.partnerId ? { status: "error" as const } : {})}
              />
              {errors.partnerId && <div style={{ color: "#ff4d4f", fontSize: 12 }}>{errors.partnerId}</div>}
            </Form.Item>
            <Form.Item label="订单日期" required style={{ marginBottom: 12 }}>
              <Input
                type="date"
                value={form.orderDate}
                onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
                {...(errors.orderDate ? { status: "error" as const } : {})}
              />
              {errors.orderDate && <div style={{ color: "#ff4d4f", fontSize: 12 }}>{errors.orderDate}</div>}
            </Form.Item>
            <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
              <Typography.Text strong>订单明细</Typography.Text>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={addOrderItem}>添加明细</Button>
            </Flex>
            {errors.items && <p style={{ color: "#ff4d4f", fontSize: 12 }}>{errors.items}</p>}
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              {form.items.map((item, index) => (
                <Card key={index} size="small" style={{ borderColor: "#f0f0f0" }}>
                  <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>明细 {index + 1}</Typography.Text>
                    {form.items.length > 1 && (
                      <Button type="link" size="small" danger onClick={() => removeOrderItem(index)}>删除</Button>
                    )}
                  </Flex>
                  <Form.Item label={itemLabel} required style={{ marginBottom: 8 }}>
                    <Select
                      value={item.itemId || undefined}
                      onChange={(val) => updateItem(index, { itemId: String(val) })}
                      placeholder={`请选择${itemLabel}`}
                      options={itemOptions}
                      {...(errors[`item-${index}`] ? { status: "error" as const } : {})}
                    />
                    {errors[`item-${index}`] && <div style={{ color: "#ff4d4f", fontSize: 12 }}>{errors[`item-${index}`]}</div>}
                  </Form.Item>
                  <Flex gap={12}>
                    <Form.Item label="数量" required style={{ flex: 1, marginBottom: 8 }}>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: e.target.value })}
                        {...(errors[`quantity-${index}`] ? { status: "error" as const } : {})}
                      />
                      {errors[`quantity-${index}`] && <div style={{ color: "#ff4d4f", fontSize: 12 }}>{errors[`quantity-${index}`]}</div>}
                    </Form.Item>
                    <Form.Item label="单价" required style={{ flex: 1, marginBottom: 8 }}>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                        {...(errors[`unitPrice-${index}`] ? { status: "error" as const } : {})}
                      />
                      {errors[`unitPrice-${index}`] && <div style={{ color: "#ff4d4f", fontSize: 12 }}>{errors[`unitPrice-${index}`]}</div>}
                    </Form.Item>
                  </Flex>
                  {orderType === "purchase" ? (
                    <Form.Item label="序列号" style={{ marginBottom: 8 }}>
                      <Input
                        value={item.serialNumber}
                        onChange={(e) => updateItem(index, { serialNumber: e.target.value })}
                        placeholder={isAssetProduct(item.itemId) ? "资产类产品建议填写序列号" : "可选"}
                      />
                    </Form.Item>
                  ) : (
                    <Form.Item label="折扣率" style={{ marginBottom: 8 }}>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        value={item.discountFactor}
                        onChange={(e) => updateItem(index, { discountFactor: e.target.value })}
                        placeholder="例如 90 表示九折"
                        {...(errors[`discountFactor-${index}`] ? { status: "error" as const } : {})}
                      />
                      {errors[`discountFactor-${index}`] && <div style={{ color: "#ff4d4f", fontSize: 12 }}>{errors[`discountFactor-${index}`]}</div>}
                    </Form.Item>
                  )}
                </Card>
              ))}
            </Space>
            <Form.Item label="备注" style={{ marginTop: 12, marginBottom: 0 }}>
              <Input.TextArea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="请输入备注"
                autoSize={{ minRows: 3 }}
              />
            </Form.Item>
          </div>
        )}
      </Modal>

      <Modal
        open={showDetail}
        title={`${orderLabel}单详情`}
        onCancel={() => setShowDetail(false)}
        footer={null}
        width={760}
        destroyOnHidden
      >
        {detailLoading ? (
          <Flex justify="center" style={{ padding: "2rem 0" }}><Spin /></Flex>
        ) : detailItem ? (
          <Space direction="vertical" style={{ width: "100%" }} size={16}>
            <Descriptions column={1} size="small" labelStyle={{ width: 100 }}>
              <Descriptions.Item label="订单编号">{detailItem.orderNo}</Descriptions.Item>
              <Descriptions.Item label="订单日期">{dateToFormattedString(detailItem.orderDate)}</Descriptions.Item>
              <Descriptions.Item label={partnerLabel}>{getPartnerValue(detailItem) ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {(() => {
                  const colors = STATUS_COLORS[detailItem.status] || { bg: "#f0f0f0", color: "#000" };
                  return <Tag style={{ backgroundColor: colors.bg, color: colors.color }}>{translateOrderStatus(detailItem.status)}</Tag>;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="总金额">{getTotalAmount(detailItem)}</Descriptions.Item>
              <Descriptions.Item label="备注">{(detailItem as unknown as Record<string, unknown>)["note"] as string ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatTimestamp(detailItem.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{formatTimestamp((detailItem as unknown as Record<string, unknown>)["updatedAt"] as string | number)}</Descriptions.Item>
            </Descriptions>
            <div>
              <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>订单明细</Typography.Text>
              <Table<OrderItem>
                columns={itemColumns}
                dataSource={getOrderItems(detailItem)}
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
    </div>
  );
}
