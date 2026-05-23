"use client";

import React from "react";
import {
  PageHeader,
  Button,
  DataTable,
  StatusTag,
  type DataTableColumn,
} from "@abacusflow/ui";
import { usePaginatedList } from "../hooks/use-paginated-list";
import { useToast } from "../hooks/use-toast";
import { dateToFormattedString } from "@abacusflow/utils";
import type {
  PurchaseOrder,
  SaleOrder,
  ListOrdersPageRequest,
  PageResponse,
} from "@abacusflow/core";

type Order = PurchaseOrder | SaleOrder;

interface OrderListPageProps {
  title: string;
  orderType: "purchase" | "sale";
  partnerLabel: string;
  partnerKey: "supplierName" | "customerName";
  listFn: (params: ListOrdersPageRequest) => Promise<PageResponse<Order>>;
  completeFn: (id: number) => Promise<void>;
  cancelFn: (id: number) => Promise<void>;
  reverseFn: (id: number) => Promise<void>;
}

export function OrderListPage({
  title,
  orderType,
  partnerLabel,
  partnerKey,
  listFn,
  completeFn,
  cancelFn,
  reverseFn,
}: OrderListPageProps) {
  const { addToast } = useToast();
  const {
    data,
    loading,
    pageIndex,
    total,
    filters,
    updateFilter,
    setPageIndex,
    refresh,
    handleSearch,
    handleReset,
  } = usePaginatedList<Order, ListOrdersPageRequest>({
    fetchFn: listFn,
    defaultFilters: { orderNo: undefined },
  });

  const handleAction = async (
    id: number,
    action: "complete" | "cancel" | "reverse",
  ) => {
    const labels = { complete: "完成", cancel: "取消", reverse: "撤回" };
    if (
      !confirm(
        `确定${labels[action]}该${orderType === "purchase" ? "采购" : "销售"}单？`,
      )
    )
      return;
    try {
      if (action === "complete") await completeFn(id);
      if (action === "cancel") await cancelFn(id);
      if (action === "reverse") await reverseFn(id);
      addToast("success", `${labels[action]}成功`);
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "操作失败");
    }
  };

  const columns: DataTableColumn<Order>[] = [
    { key: "orderNo", title: "订单编号", dataIndex: "orderNo" },
    {
      key: "orderDate",
      title: "订单日期",
      render: (_, record) => dateToFormattedString(record.orderDate),
    },
    {
      key: partnerKey,
      title: partnerLabel,
      render: (_, record) =>
        ((record as unknown as Record<string, unknown>)[
          partnerKey
        ] as string) ?? "-",
    },
    {
      key: "status",
      title: "状态",
      render: (_, record) => <StatusTag status={record.status} />,
    },
    {
      key: "totalAmount",
      title: "总金额",
      render: (_, record) => record.totalAmount?.toLocaleString("zh-CN") ?? "-",
    },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button type="link" label="详情" onClick={() => {}} />
          {record.status === "pending" && (
            <>
              <Button
                type="link"
                label="完成"
                onClick={() => handleAction(record.id, "complete")}
              />
              <Button
                type="link"
                label="取消"
                onClick={() => handleAction(record.id, "cancel")}
              />
            </>
          )}
          {record.status === "completed" && (
            <Button
              type="link"
              label="撤回"
              onClick={() => handleAction(record.id, "reverse")}
            />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={title}
        extra={
          <Button
            type="primary"
            label={`新增${orderType === "purchase" ? "采购" : "销售"}单`}
            onClick={() => {}}
          />
        }
      />
      <div className="card">
        <div className="form-inline mb-4">
          <div className="form-item">
            <label>订单编号</label>
            <input
              value={filters.orderNo ?? ""}
              onChange={(e) =>
                updateFilter("orderNo", e.target.value || undefined)
              }
              placeholder="请输入订单编号"
            />
          </div>
          <Button type="primary" label="搜索" onClick={handleSearch} />
          <Button label="重置" onClick={handleReset} />
        </div>
      </div>
      <div className="card">
        <DataTable
          columns={columns}
          data={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pageIndex,
            pageSize: 10,
            total,
            onChange: setPageIndex,
          }}
        />
      </div>
    </div>
  );
}
