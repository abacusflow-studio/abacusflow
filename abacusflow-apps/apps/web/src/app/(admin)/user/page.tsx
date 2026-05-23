"use client";

import React, { useState } from "react";
import {
  PageHeader, Button, DataTable, Modal,
  FormField, FormInput, FormSelect,
  type DataTableColumn,
} from "@abacusflow/ui";
import { userApi, type User, type CreateUserRequest } from "@abacusflow/core";
import { isNonEmpty } from "@abacusflow/utils";
import { usePaginatedList } from "../../../hooks/use-paginated-list";
import { useToast } from "../../../hooks/use-toast";

interface UserForm {
  name: string;
  nick: string;
  age: string;
  sex: string;
}

const emptyForm: UserForm = { name: "", nick: "", age: "", sex: "" };

const sexOptions = [
  { label: "男", value: "男" },
  { label: "女", value: "女" },
];

export default function UsersPage() {
  const { addToast } = useToast();
  const [editItem, setEditItem] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof UserForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<User | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const {
    data, loading, pageIndex, total, filters,
    updateFilter, setPageIndex, refresh, handleSearch, handleReset,
  } = usePaginatedList<User, { name?: string }>({
    fetchFn: (params) =>
      userApi.listUsersPage(params as Parameters<typeof userApi.listUsersPage>[0]),
    defaultFilters: { name: undefined },
  });

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (record: User) => {
    setEditItem(record);
    setForm({
      name: record.name,
      nick: record.nick ?? "",
      age: record.age?.toString() ?? "",
      sex: record.sex ?? "",
    });
    setErrors({});
    setShowForm(true);
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await userApi.getUser(id);
      setDetailItem(item);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "加载失败");
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof UserForm, string>> = {};
    if (!isNonEmpty(form.name)) newErrors.name = "请输入用户名";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: CreateUserRequest = {
        name: form.name,
        nick: form.nick || undefined,
        age: form.age ? Number(form.age) : undefined,
        sex: form.sex || undefined,
      };
      if (editItem) {
        await userApi.updateUser({ ...payload, id: editItem.id });
        addToast("success", "编辑成功");
      } else {
        await userApi.createUser(payload);
        addToast("success", "新增成功");
      }
      setShowForm(false);
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="flex gap-2">
          <Button type="link" label="详情" onClick={() => openDetail(record.id)} />
          {record.name !== "admin" && (
            <>
              <Button type="link" label="编辑" onClick={() => openEdit(record)} />
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
        extra={<Button type="primary" label="新增用户" onClick={openCreate} />}
      />
      <div className="card">
        <div className="form-inline mb-4">
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

      <Modal
        open={showForm}
        title={editItem ? "编辑用户" : "新增用户"}
        onClose={() => setShowForm(false)}
        onOk={handleSubmit}
        okLoading={submitting}
        width={520}
      >
        <FormField label="用户名" required error={errors.name}>
          <FormInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="请输入用户名"
            error={!!errors.name}
          />
        </FormField>
        <FormField label="昵称">
          <FormInput
            value={form.nick}
            onChange={(e) => setForm({ ...form, nick: e.target.value })}
            placeholder="请输入昵称"
          />
        </FormField>
        <FormField label="年龄">
          <FormInput
            type="number"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            placeholder="请输入年龄"
          />
        </FormField>
        <FormField label="性别">
          <FormSelect
            value={form.sex}
            onChange={(e) => setForm({ ...form, sex: e.target.value })}
            options={sexOptions}
            placeholder="请选择"
          />
        </FormField>
      </Modal>

      <Modal
        open={showDetail}
        title="用户详情"
        onClose={() => setShowDetail(false)}
        width={520}
      >
        {detailLoading ? (
          <p className="text-gray-400 text-center py-8">加载中...</p>
        ) : detailItem ? (
          <div className="flex flex-col gap-3">
            <DetailRow label="用户名" value={detailItem.name} />
            <DetailRow label="昵称" value={detailItem.nick} />
            <DetailRow label="年龄" value={detailItem.age} />
            <DetailRow label="性别" value={detailItem.sex} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ color: "#999", minWidth: 80, flexShrink: 0 }}>{label}：</span>
      <span>{value ?? "-"}</span>
    </div>
  );
}
