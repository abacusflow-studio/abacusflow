"use client";

import React, { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { App, Button, Card, Space, Table, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "./admin-page-header";
import { usePaginatedList } from "../hooks/use-paginated-list";
import { useOrderCreate } from "../hooks/use-order-create";
import { useOrderDetail } from "../hooks/use-order-detail";
import { useNewCustomer } from "../hooks/use-new-customer";
import { OrderFilterBar } from "./order-list-filter-bar";
import { OrderCreateModal } from "./order-list-create-modal";
import { OrderDetailModal } from "./order-list-detail-modal";
import { NewCustomerModal } from "./new-customer-modal";
import {
  dateToFormattedString,
  translateOrderStatus,
  STATUS_COLORS,
} from "@abacusflow/utils";
import type { AnyParams, Order, OrderListPageProps } from "./order-list-types";

const ACTION_LABELS = {
  complete: "完成",
  cancel: "取消",
  reverse: "撤回",
} as const;

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

  const orderLabel = orderType === "purchase" ? "采购" : "销售";
  const itemLabel = orderType === "purchase" ? "产品" : "库存单元";
  const partnerFilterKey =
    orderType === "purchase" ? "supplierName" : "customerName";
  const pageDescription =
    orderType === "purchase"
      ? "集中跟踪采购入库、供应商和产品明细，让补货链路保持清晰可控。"
      : "集中跟踪销售出库、客户和库存单元，让交付链路保持稳定可追溯。";

  const defaultFilters = useMemo<Partial<AnyParams>>(
    () =>
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
          },
    [orderType],
  );

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
  } = usePaginatedList<Order, AnyParams>({ fetchFn: listFn, defaultFilters });

  const {
    showForm,
    setShowForm,
    form,
    setForm,
    formLoading,
    submitting,
    partnerOptions,
    setPartnerOptions,
    itemOptions,
    errors,
    isAssetProduct,
    openCreate,
    updateItem,
    addOrderItem,
    removeOrderItem,
    handleSubmit,
  } = useOrderCreate({
    orderType,
    orderLabel,
    partnerLabel,
    itemLabel,
    message,
    refresh,
  });

  const { showDetail, detailItem, detailLoading, openDetail, closeDetail } =
    useOrderDetail({ getDetailFn, message });

  const {
    show: showNewCustomer,
    close: closeNewCustomer,
    form: newCustomerForm,
    setForm: setNewCustomerForm,
    errors: newCustomerErrors,
    submitting: newCustomerSubmitting,
    open: openNewCustomer,
    handleSubmit: submitNewCustomer,
  } = useNewCustomer({
    onCreated: (option) => {
      setPartnerOptions((prev) => [...prev, option]);
      setForm((prev) => ({ ...prev, partnerId: String(option.value) }));
    },
    message,
  });

  const searchParams = useSearchParams();
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (!idParam) return;
    const id = Number(idParam);
    if (!isNaN(id)) openDetail(id);
  }, [searchParams, openDetail]);

  const handleAction = async (
    id: number,
    action: "complete" | "cancel" | "reverse",
  ) => {
    modal.confirm({
      title: "确认操作",
      content: `确定${ACTION_LABELS[action]}该${orderLabel}单？`,
      onOk: async () => {
        try {
          if (action === "complete") await completeFn(id);
          if (action === "cancel") await cancelFn(id);
          if (action === "reverse") await reverseFn(id);
          message.success(`${ACTION_LABELS[action]}成功`);
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
        ((record as unknown as Record<string, unknown>)[
          partnerKey
        ] as string) ?? "-",
    },
    {
      title: "状态",
      key: "status",
      render: (_, record) => {
        const colors = STATUS_COLORS[record.status] ?? {
          bg: "#f0f0f0",
          color: "#000",
        };
        return (
          <Tag
            style={{
              backgroundColor: colors.bg,
              color: colors.color,
              borderColor: `${colors.color}30`,
            }}
          >
            {translateOrderStatus(record.status)}
          </Tag>
        );
      },
    },
    {
      title: "总金额",
      key: "totalAmount",
      render: (_, record) =>
        (
          (record as unknown as Record<string, unknown>)[
            "totalAmount"
          ] as number
        )?.toLocaleString("zh-CN") ?? "-",
    },
    { title: "总数量", dataIndex: "totalQuantity", key: "totalQuantity" },
    { title: "明细数", dataIndex: "itemCount", key: "itemCount" },
    {
      title: "自动完成日期",
      key: "autoCompleteDate",
      render: (_, record) =>
        dateToFormattedString(
          (record as unknown as Record<string, unknown>)["autoCompleteDate"] as
            | Date
            | undefined,
        ),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => openDetail(record.id)}
          >
            详情
          </Button>
          {record.status === "pending" && (
            <>
              <Button
                type="link"
                size="small"
                onClick={() => handleAction(record.id, "complete")}
              >
                完成
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => handleAction(record.id, "cancel")}
              >
                取消
              </Button>
            </>
          )}
          {record.status === "completed" && (
            <Button
              type="link"
              size="small"
              onClick={() => handleAction(record.id, "reverse")}
            >
              撤回
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow={`${orderLabel}链路 / 订单流转`}
        title={title}
        description={pageDescription}
        metrics={[
          { label: "订单总数", value: total },
          { label: "当前页", value: data.length },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {`新增${orderLabel}单`}
          </Button>
        }
      />

      <OrderFilterBar
        orderType={orderType}
        orderLabel={orderLabel}
        partnerLabel={partnerLabel}
        partnerFilterKey={partnerFilterKey}
        filters={filters}
        updateFilter={updateFilter}
        handleSearch={handleSearch}
        handleReset={handleReset}
      />

      <Card className="af-table-card">
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

      <OrderCreateModal
        open={showForm}
        onCancel={() => setShowForm(false)}
        onOk={() => handleSubmit(form)}
        confirmLoading={submitting}
        orderType={orderType}
        orderLabel={orderLabel}
        itemLabel={itemLabel}
        partnerLabel={partnerLabel}
        formLoading={formLoading}
        form={form}
        errors={errors}
        partnerOptions={partnerOptions}
        itemOptions={itemOptions}
        isAssetProduct={isAssetProduct}
        onPartnerChange={(id) =>
          setForm((prev) => ({ ...prev, partnerId: id }))
        }
        onDateChange={(date) =>
          setForm((prev) => ({ ...prev, orderDate: date }))
        }
        onNoteChange={(note) => setForm((prev) => ({ ...prev, note }))}
        onItemUpdate={updateItem}
        onAddItem={addOrderItem}
        onRemoveItem={removeOrderItem}
        onOpenNewCustomer={openNewCustomer}
      />

      <OrderDetailModal
        open={showDetail}
        onClose={closeDetail}
        loading={detailLoading}
        order={detailItem}
        orderType={orderType}
        orderLabel={orderLabel}
        partnerLabel={partnerLabel}
        partnerKey={partnerKey}
      />

      <NewCustomerModal
        open={showNewCustomer}
        onCancel={closeNewCustomer}
        onOk={submitNewCustomer}
        confirmLoading={newCustomerSubmitting}
        form={newCustomerForm}
        errors={newCustomerErrors}
        onChange={(patch) =>
          setNewCustomerForm((prev) => ({ ...prev, ...patch }))
        }
      />
    </div>
  );
}
