"use client";

import React, { useState } from "react";
import { PageHeader, Button, DataTable, Modal, type DataTableColumn } from "@abacusflow/ui";
import { productApi, type BasicProduct } from "@abacusflow/core";
import { translateProductType, translateProductUnit } from "@abacusflow/utils";
import { usePaginatedList } from "../../../hooks/use-paginated-list";
import { useToast } from "../../../hooks/use-toast";

export default function ProductsPage() {
  const { addToast } = useToast();
  const [editItem, setEditItem] = useState<BasicProduct | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    data, loading, pageIndex, total, filters,
    updateFilter, setPageIndex, refresh, handleSearch, handleReset,
  } = usePaginatedList<BasicProduct, { name?: string }>({
    fetchFn: (params) => productApi.listBasicProductsPage(params as Parameters<typeof productApi.listBasicProductsPage>[0]),
    defaultFilters: { name: undefined },
  });

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该产品？")) return;
    try {
      await productApi.deleteProduct(id);
      addToast("success", "删除成功");
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns: DataTableColumn<BasicProduct>[] = [
    { key: "name", title: "产品名称", dataIndex: "name" },
    { key: "specification", title: "产品规格", dataIndex: "specification" },
    { key: "categoryName", title: "产品类别", dataIndex: "categoryName" },
    {
      key: "type",
      title: "产品类型",
      render: (_, record) => translateProductType(record.type),
    },
    { key: "barcode", title: "条形码", dataIndex: "barcode" },
    {
      key: "unit",
      title: "单位",
      render: (_, record) => translateProductUnit(record.unit),
    },
    {
      key: "enabled",
      title: "启用状态",
      render: (_, record) => (
        <span style={{ color: record.enabled ? "#52c41a" : "#ff4d4f" }}>
          {record.enabled ? "启用" : "禁用"}
        </span>
      ),
    },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="link" label="编辑" onClick={() => { setEditItem(record); setShowForm(true); }} />
          <Button type="link" label="删除" onClick={() => handleDelete(record.id)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="产品管理"
        extra={<Button type="primary" label="新增产品" onClick={() => { setEditItem(null); setShowForm(true); }} />}
      />
      <div className="card">
        <div className="form-inline" style={{ marginBottom: 16 }}>
          <div className="form-item">
            <label>产品名称</label>
            <input
              value={filters.name ?? ""}
              onChange={(e) => updateFilter("name", e.target.value || undefined)}
              placeholder="请输入产品名称"
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
      <Modal open={showForm} title={editItem ? "编辑产品" : "新增产品"} onClose={() => setShowForm(false)}>
        <p style={{ color: "#999", textAlign: "center", padding: 32 }}>表单开发中...</p>
      </Modal>
    </div>
  );
}
