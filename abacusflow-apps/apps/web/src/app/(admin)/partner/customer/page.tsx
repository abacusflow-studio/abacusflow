"use client";

import React, { useState } from "react";
import {
  PageHeader,
  Button,
  DataTable,
  Modal,
  type DataTableColumn,
} from "@abacusflow/ui";
import { customerApi, type Customer } from "@abacusflow/core";
import { usePaginatedList } from "../../../../hooks/use-paginated-list";
import { useToast } from "../../../../hooks/use-toast";

export default function CustomersPage() {
  const { addToast } = useToast();
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);

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
  } = usePaginatedList<
    Customer,
    { name?: string; phone?: string; address?: string }
  >({
    fetchFn: (params) =>
      customerApi.listCustomersPage(
        params as Parameters<typeof customerApi.listCustomersPage>[0],
      ),
    defaultFilters: { name: undefined, phone: undefined, address: undefined },
  });

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该客户？")) return;
    try {
      await customerApi.deleteCustomer(id);
      addToast("success", "删除成功");
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns: DataTableColumn<Customer>[] = [
    { key: "name", title: "客户名称", dataIndex: "name" },
    { key: "phone", title: "联系电话", dataIndex: "phone" },
    { key: "address", title: "地址", dataIndex: "address" },
    { key: "totalOrders", title: "历史订单数", dataIndex: "totalOrders" },
    {
      key: "totalAmount",
      title: "历史订单金额",
      render: (_, record) => record.totalAmount?.toLocaleString("zh-CN") ?? "-",
    },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            type="link"
            label="编辑"
            onClick={() => {
              setEditItem(record);
              setShowForm(true);
            }}
          />
          <Button
            type="link"
            label="删除"
            onClick={() => handleDelete(record.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="客户管理"
        extra={
          <Button
            type="primary"
            label="新增客户"
            onClick={() => {
              setEditItem(null);
              setShowForm(true);
            }}
          />
        }
      />
      <div className="card">
        <div className="form-inline mb-4">
          <div className="form-item">
            <label>客户名称</label>
            <input
              value={filters.name ?? ""}
              onChange={(e) =>
                updateFilter("name", e.target.value || undefined)
              }
              placeholder="请输入客户名称"
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
      <Modal
        open={showForm}
        title={editItem ? "编辑客户" : "新增客户"}
        onClose={() => setShowForm(false)}
      >
        <p className="text-gray-400 text-center py-8">表单开发中...</p>
      </Modal>
    </div>
  );
}
