"use client";

import React, { useState } from "react";
import { PageHeader, Button, DataTable, Modal, type DataTableColumn } from "@abacusflow/ui";
import { userApi, type User } from "@abacusflow/core";
import { usePaginatedList } from "../../../hooks/use-paginated-list";
import { useToast } from "../../../hooks/use-toast";

export default function UsersPage() {
  const { addToast } = useToast();
  const [editItem, setEditItem] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    data, loading, pageIndex, total, filters,
    updateFilter, setPageIndex, refresh, handleSearch, handleReset,
  } = usePaginatedList<User, { name?: string }>({
    fetchFn: (params) => userApi.listUsersPage(params as Parameters<typeof userApi.listUsersPage>[0]),
    defaultFilters: { name: undefined },
  });

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该用户？")) return;
    try {
      await userApi.deleteUser(id);
      addToast("success", "删除成功");
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns: DataTableColumn<User>[] = [
    { key: "name", title: "用户名", dataIndex: "name" },
    { key: "nick", title: "昵称", dataIndex: "nick" },
    { key: "age", title: "年龄", dataIndex: "age" },
    { key: "sex", title: "性别", dataIndex: "sex" },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8 }}>
          {record.name !== "admin" && (
            <>
              <Button type="link" label="编辑" onClick={() => { setEditItem(record); setShowForm(true); }} />
              <Button type="link" label="删除" onClick={() => handleDelete(record.id)} />
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="用户管理"
        extra={<Button type="primary" label="新增用户" onClick={() => { setEditItem(null); setShowForm(true); }} />}
      />
      <div className="card">
        <div className="form-inline" style={{ marginBottom: 16 }}>
          <div className="form-item">
            <label>用户名</label>
            <input
              value={filters.name ?? ""}
              onChange={(e) => updateFilter("name", e.target.value || undefined)}
              placeholder="请输入用户名"
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
      <Modal open={showForm} title={editItem ? "编辑用户" : "新增用户"} onClose={() => setShowForm(false)}>
        <p style={{ color: "#999", textAlign: "center", padding: 32 }}>表单开发中...</p>
      </Modal>
    </div>
  );
}
