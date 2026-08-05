"use client";

import React from "react";
import { Button, Card, Flex, Input, Select } from "antd";
import { ORDER_STATUS_OPTIONS, type AnyParams } from "./order-list-types";

interface OrderFilterBarProps {
  orderType: "purchase" | "sale";
  orderLabel: string;
  partnerLabel: string;
  partnerFilterKey: string;
  filters: AnyParams;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateFilter: (key: string, value: any) => void;
  handleSearch: () => void;
  handleReset: () => void;
}

export function OrderFilterBar({
  orderType,
  orderLabel,
  partnerLabel,
  partnerFilterKey,
  filters,
  updateFilter,
  handleSearch,
  handleReset,
}: OrderFilterBarProps) {
  return (
    <Card className="af-filter-card">
      <Flex wrap="wrap" gap={12} align="flex-end">
        <div className="form-item">
          <label>订单编号</label>
          <Input
            value={(filters.orderNo as string) ?? ""}
            onChange={(e) =>
              updateFilter("orderNo", e.target.value || undefined)
            }
            placeholder={`请输入${orderLabel}单号`}
          />
        </div>
        <div className="form-item">
          <label>订单日期</label>
          <Input
            type="date"
            value={(filters.orderDate as string) ?? ""}
            onChange={(e) =>
              updateFilter("orderDate", e.target.value || undefined)
            }
          />
        </div>
        <div className="form-item">
          <label>{partnerLabel}</label>
          <Input
            value={(filters[partnerFilterKey] as string) ?? ""}
            onChange={(e) =>
              updateFilter(partnerFilterKey, e.target.value || undefined)
            }
            placeholder={`请输入${partnerLabel}`}
          />
        </div>
        <div className="form-item">
          <label>状态</label>
          <Select
            value={(filters.status as string) ?? undefined}
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
                value={(filters.productName as string) ?? ""}
                onChange={(e) =>
                  updateFilter("productName", e.target.value || undefined)
                }
                placeholder="请输入产品名称"
              />
            </div>
            <div className="form-item">
              <label>序列号</label>
              <Input
                value={(filters.serialNumber as string) ?? ""}
                onChange={(e) =>
                  updateFilter("serialNumber", e.target.value || undefined)
                }
                placeholder="请输入序列号"
              />
            </div>
          </>
        ) : (
          <div className="form-item">
            <label>库存单元</label>
            <Input
              value={(filters.inventoryUnitName as string) ?? ""}
              onChange={(e) =>
                updateFilter("inventoryUnitName", e.target.value || undefined)
              }
              placeholder="请输入库存单元名"
            />
          </div>
        )}
        <Button type="primary" onClick={handleSearch}>
          搜索
        </Button>
        <Button onClick={handleReset}>重置</Button>
      </Flex>
    </Card>
  );
}
