"use client";

import React from "react";
import {
  Button,
  Card,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { formatCurrency } from "@abacusflow/utils";
import type {
  OrderForm,
  OrderItemForm,
  SelectOption,
} from "./order-list-types";

interface OrderCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  confirmLoading: boolean;
  orderType: "purchase" | "sale";
  orderLabel: string;
  itemLabel: string;
  partnerLabel: string;
  formLoading: boolean;
  form: OrderForm;
  errors: Record<string, string>;
  partnerOptions: SelectOption[];
  itemOptions: SelectOption[];
  isAssetProduct: (id: string) => boolean;
  onPartnerChange: (id: string) => void;
  onDateChange: (date: string) => void;
  onNoteChange: (note: string) => void;
  onItemUpdate: (index: number, patch: Partial<OrderItemForm>) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onOpenNewCustomer: () => void;
}

export function OrderCreateModal({
  open,
  onCancel,
  onOk,
  confirmLoading,
  orderType,
  orderLabel,
  itemLabel,
  partnerLabel,
  formLoading,
  form,
  errors,
  partnerOptions,
  itemOptions,
  isAssetProduct,
  onPartnerChange,
  onDateChange,
  onNoteChange,
  onItemUpdate,
  onAddItem,
  onRemoveItem,
  onOpenNewCustomer,
}: OrderCreateModalProps) {
  return (
    <Modal
      open={open}
      title={`新增${orderLabel}单`}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
      width={760}
      destroyOnHidden
    >
      {formLoading ? (
        <Flex justify="center" style={{ padding: "2rem 0" }}>
          <Spin />
        </Flex>
      ) : (
        <div style={{ marginTop: 16 }}>
          <Form.Item label={partnerLabel} required style={{ marginBottom: 12 }}>
            <Select
              value={form.partnerId || undefined}
              onChange={(val) => onPartnerChange(String(val))}
              placeholder={`请选择${partnerLabel}`}
              options={partnerOptions}
              showSearch={{ optionFilterProp: "label" }}
              status={errors.partnerId ? "error" : undefined}
              dropdownRender={
                orderType === "sale"
                  ? (menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: "4px 0" }} />
                        <div style={{ padding: "4px 8px" }}>
                          <Button
                            type="link"
                            icon={<PlusOutlined />}
                            size="small"
                            onClick={onOpenNewCustomer}
                          >
                            新增客户
                          </Button>
                        </div>
                      </>
                    )
                  : undefined
              }
            />
            {errors.partnerId && <FieldError>{errors.partnerId}</FieldError>}
          </Form.Item>

          <Form.Item label="订单日期" required style={{ marginBottom: 12 }}>
            <Input
              type="date"
              value={form.orderDate}
              onChange={(e) => onDateChange(e.target.value)}
              status={errors.orderDate ? "error" : undefined}
            />
            {errors.orderDate && <FieldError>{errors.orderDate}</FieldError>}
          </Form.Item>

          <Flex
            justify="space-between"
            align="center"
            style={{ marginBottom: 8 }}
          >
            <Typography.Text strong>订单明细</Typography.Text>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={onAddItem}
            >
              添加明细
            </Button>
          </Flex>
          {errors.items && <FieldError>{errors.items}</FieldError>}

          <Space direction="vertical" style={{ width: "100%" }} size={12}>
            {form.items.map((item, index) => (
              <OrderItemRow
                key={index}
                index={index}
                item={item}
                orderType={orderType}
                itemLabel={itemLabel}
                itemOptions={itemOptions}
                errors={errors}
                isAssetProduct={isAssetProduct}
                canRemove={form.items.length > 1}
                onUpdate={(patch) => onItemUpdate(index, patch)}
                onRemove={() => onRemoveItem(index)}
              />
            ))}
          </Space>

          <Form.Item label="备注" style={{ marginTop: 12, marginBottom: 0 }}>
            <Input.TextArea
              value={form.note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="请输入备注"
              autoSize={{ minRows: 3 }}
            />
          </Form.Item>
        </div>
      )}
    </Modal>
  );
}

interface OrderItemRowProps {
  index: number;
  item: OrderItemForm;
  orderType: "purchase" | "sale";
  itemLabel: string;
  itemOptions: SelectOption[];
  errors: Record<string, string>;
  isAssetProduct: (id: string) => boolean;
  canRemove: boolean;
  onUpdate: (patch: Partial<OrderItemForm>) => void;
  onRemove: () => void;
}

function OrderItemRow({
  index,
  item,
  orderType,
  itemLabel,
  itemOptions,
  errors,
  isAssetProduct,
  canRemove,
  onUpdate,
  onRemove,
}: OrderItemRowProps) {
  return (
    <Card size="small" style={{ borderColor: "#f0f0f0" }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          明细 {index + 1}
        </Typography.Text>
        {canRemove && (
          <Button type="link" size="small" danger onClick={onRemove}>
            删除
          </Button>
        )}
      </Flex>

      <Form.Item label={itemLabel} required style={{ marginBottom: 8 }}>
        <Select
          value={item.itemId || undefined}
          onChange={(val) =>
            onUpdate({ itemId: String(val), serialNumber: "" })
          }
          placeholder={`请选择${itemLabel}`}
          options={itemOptions}
          showSearch={{ optionFilterProp: "label" }}
          status={errors[`item-${index}`] ? "error" : undefined}
        />
        {errors[`item-${index}`] && (
          <FieldError>{errors[`item-${index}`]}</FieldError>
        )}
      </Form.Item>

      <Flex gap={12}>
        <Form.Item label="数量" required style={{ flex: 1, marginBottom: 8 }}>
          <Input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => onUpdate({ quantity: e.target.value })}
            status={errors[`quantity-${index}`] ? "error" : undefined}
          />
          {errors[`quantity-${index}`] && (
            <FieldError>{errors[`quantity-${index}`]}</FieldError>
          )}
        </Form.Item>
        <Form.Item label="单价" required style={{ flex: 1, marginBottom: 8 }}>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={item.unitPrice}
            onChange={(e) => onUpdate({ unitPrice: e.target.value })}
            status={errors[`unitPrice-${index}`] ? "error" : undefined}
          />
          {errors[`unitPrice-${index}`] && (
            <FieldError>{errors[`unitPrice-${index}`]}</FieldError>
          )}
        </Form.Item>
      </Flex>

      {orderType === "purchase" ? (
        <Form.Item
          label="序列号"
          required={isAssetProduct(item.itemId)}
          style={{ marginBottom: 8 }}
        >
          <Input
            value={item.serialNumber}
            onChange={(e) => onUpdate({ serialNumber: e.target.value })}
            status={errors[`serialNumber-${index}`] ? "error" : undefined}
            placeholder={
              isAssetProduct(item.itemId) ? "资产类产品必须填写序列号" : "可选"
            }
          />
          {errors[`serialNumber-${index}`] && (
            <FieldError>{errors[`serialNumber-${index}`]}</FieldError>
          )}
        </Form.Item>
      ) : (
        <Flex gap={12}>
          <Form.Item label="折扣率" style={{ flex: 1, marginBottom: 8 }}>
            <Input
              type="number"
              min={0}
              max={100}
              step="1"
              value={item.discountFactor}
              onChange={(e) => onUpdate({ discountFactor: e.target.value })}
              placeholder="例如 90 表示九折"
              status={errors[`discountFactor-${index}`] ? "error" : undefined}
            />
            {errors[`discountFactor-${index}`] && (
              <FieldError>{errors[`discountFactor-${index}`]}</FieldError>
            )}
          </Form.Item>
          <Form.Item label="折后总价" style={{ flex: 1, marginBottom: 8 }}>
            <Typography.Text strong>
              {discountedTotalPriceText(item)}
            </Typography.Text>
          </Form.Item>
        </Flex>
      )}
    </Card>
  );
}

function discountedTotalPriceText(item: OrderItemForm): string {
  const unitPrice = Number(item.unitPrice);
  const quantity = Number(item.quantity);
  if (!item.unitPrice || Number.isNaN(unitPrice)) return "—";
  if (!item.quantity || Number.isNaN(quantity)) return "—";
  // 与提交逻辑一致:折扣率留空视为 100(不打折)
  const discount = item.discountFactor ? Number(item.discountFactor) : 100;
  if (Number.isNaN(discount) || discount < 0 || discount > 100) return "—";
  return formatCurrency(unitPrice * quantity * (discount / 100));
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#ff4d4f", fontSize: 12 }}>{children}</div>;
}
