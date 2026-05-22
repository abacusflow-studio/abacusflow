"use client";

import React, { useState } from "react";
import { PageHeader, Button, DataTable, Modal, type DataTableColumn } from "@abacusflow/ui";
import { supplierApi, type Supplier } from "@abacusflow/core";
import { usePaginatedList } from "../../../../hooks/use-paginated-list";
import { useToast } from "../../../../hooks/use-toast";

export default function SuppliersPage() {
  const { addToast } = useToast();
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    data, loading, pageIndex, total, filters,
    updateFilter, setPageIndex, refresh, handleSearch, handleReset,
  } = usePaginatedList<Supplier, { name?: string; contactPerson?: string; phone?: string; address?: string }>({
    fetchFn: (params) => supplierApi.listSuppliersPage(params as Parameters<typeof supplierApi.listSuppliersPage>[0]),
    defaultFilters: { name: undefined, contactPerson: undefined, phone: undefined, address: undefined },
  });

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该供应商？")) return;
    try {
      await supplierApi.deleteSupplier(id);
      addToast("success", "删除成功");
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns: DataTableColumn<Supplier>[] = [
    { key: "name", title: "供应商名称", dataIndex: "name" },
    { key: "contactPerson", title: "联系人", dataIndex: "contactPerson" },
    { key: "phone", title: "联系电话", dataIndex: "phone" },
    { key: "email", title: "邮箱", dataIndex: "email" },
    { key: "address", title: "地址", dataIndex: "address" },
    { key: "totalOrders", title: "历史订单数", dataIndex: "totalOrders" },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button type="link" label="编辑" onClick={() => { setEditItem(record); setShowForm(true); }} />
          <Button type="link" label="删除" onClick={() => handleDelete(record.id)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="供应商管理"
        extra={<Button type="primary" label="新增供应商" onClick={() => { setEditItem(null); setShowForm(true); }} />}
      />
      <div className="card">
        <div className="form-inline mb-4">
          <div className="form-item">
            <label>供应商名称</label>
            <input
              value={filters.name ?? ""}
              onChange={(e) => updateFilter("name", e.target.value || undefined)}
              placeholder="请输入供应商名称"
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
          pagination={{ current: pageIndex, pageSize: 10, total, onChange: setPageIndex }}
        />
      </div>
      <Modal open={showForm} title={editItem ? "编辑供应商" : "新增供应商"} onClose={() => setShowForm(false)}>
        <p className="text-gray-400 text-center py-8">表单开发中...</p>
      </Modal>
    </div>
  );
}
