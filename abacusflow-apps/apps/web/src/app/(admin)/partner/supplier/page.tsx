"use client";

import React, { useState } from "react";
import {
  PageHeader, Button, DataTable, Modal,
  FormField, FormInput,
  type DataTableColumn,
} from "@abacusflow/ui";
import { supplierApi, type Supplier, type CreateSupplierRequest } from "@abacusflow/core";
import { isNonEmpty, isValidPhone, isValidEmail } from "@abacusflow/utils";
import { usePaginatedList } from "../../../../hooks/use-paginated-list";
import { useToast } from "../../../../hooks/use-toast";

interface SupplierForm {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

const emptyForm: SupplierForm = { name: "", contactPerson: "", phone: "", email: "", address: "" };

export default function SuppliersPage() {
  const { addToast } = useToast();
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Supplier | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const {
    data, loading, pageIndex, total, filters,
    updateFilter, setPageIndex, refresh, handleSearch, handleReset,
  } = usePaginatedList<Supplier, { name?: string; contactPerson?: string; phone?: string; address?: string }>({
    fetchFn: (params) =>
      supplierApi.listSuppliersPage(params as Parameters<typeof supplierApi.listSuppliersPage>[0]),
    defaultFilters: { name: undefined, contactPerson: undefined, phone: undefined, address: undefined },
  });

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (record: Supplier) => {
    setEditItem(record);
    setForm({
      name: record.name,
      contactPerson: record.contactPerson ?? "",
      phone: record.phone ?? "",
      email: record.email ?? "",
      address: record.address ?? "",
    });
    setErrors({});
    setShowForm(true);
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await supplierApi.getSupplier(id);
      setDetailItem(item);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "加载失败");
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof SupplierForm, string>> = {};
    if (!isNonEmpty(form.name)) newErrors.name = "请输入供应商名称";
    if (form.phone && !isValidPhone(form.phone)) newErrors.phone = "请输入正确的手机号";
    if (form.email && !isValidEmail(form.email)) newErrors.email = "请输入正确的邮箱";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: CreateSupplierRequest = {
        name: form.name,
        contactPerson: form.contactPerson || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
      };
      if (editItem) {
        await supplierApi.updateSupplier({ ...payload, id: editItem.id });
        addToast("success", "编辑成功");
      } else {
        await supplierApi.createSupplier(payload);
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
    {
      key: "totalOrderCount",
      title: "历史订单数",
      render: (_, record) => record.totalOrderCount ?? record.totalOrders ?? "-",
    },
    {
      key: "totalOrderAmount",
      title: "历史订单金额",
      render: (_, record) =>
        (record.totalOrderAmount ?? record.totalAmount)?.toLocaleString("zh-CN") ?? "-",
    },
    { key: "lastOrderDate", title: "最近交易日期", dataIndex: "lastOrderDate" },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button type="link" label="详情" onClick={() => openDetail(record.id)} />
          <Button type="link" label="编辑" onClick={() => openEdit(record)} />
          <Button type="link" label="删除" onClick={() => handleDelete(record.id)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="供应商管理"
        extra={<Button type="primary" label="新增供应商" onClick={openCreate} />}
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
          <div className="form-item">
            <label>联系人</label>
            <input
              value={filters.contactPerson ?? ""}
              onChange={(e) => updateFilter("contactPerson", e.target.value || undefined)}
              placeholder="请输入联系人"
            />
          </div>
          <div className="form-item">
            <label>电话</label>
            <input
              value={filters.phone ?? ""}
              onChange={(e) => updateFilter("phone", e.target.value || undefined)}
              placeholder="请输入电话"
            />
          </div>
          <div className="form-item">
            <label>地址</label>
            <input
              value={filters.address ?? ""}
              onChange={(e) => updateFilter("address", e.target.value || undefined)}
              placeholder="请输入地址"
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
        title={editItem ? "编辑供应商" : "新增供应商"}
        onClose={() => setShowForm(false)}
        onOk={handleSubmit}
        okLoading={submitting}
        width={560}
      >
        <FormField label="供应商名称" required error={errors.name}>
          <FormInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="请输入供应商名称"
            error={!!errors.name}
          />
        </FormField>
        <FormField label="联系人">
          <FormInput
            value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            placeholder="请输入联系人"
          />
        </FormField>
        <FormField label="联系电话" error={errors.phone}>
          <FormInput
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="请输入联系电话"
            error={!!errors.phone}
          />
        </FormField>
        <FormField label="邮箱" error={errors.email}>
          <FormInput
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="请输入邮箱"
            error={!!errors.email}
          />
        </FormField>
        <FormField label="地址">
          <FormInput
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="请输入地址"
          />
        </FormField>
      </Modal>

      <Modal
        open={showDetail}
        title="供应商详情"
        onClose={() => setShowDetail(false)}
        width={560}
      >
        {detailLoading ? (
          <p className="text-gray-400 text-center py-8">加载中...</p>
        ) : detailItem ? (
          <div className="flex flex-col gap-3">
            <DetailRow label="供应商名称" value={detailItem.name} />
            <DetailRow label="联系人" value={detailItem.contactPerson} />
            <DetailRow label="联系电话" value={detailItem.phone} />
            <DetailRow label="邮箱" value={detailItem.email} />
            <DetailRow label="地址" value={detailItem.address} />
            <DetailRow label="历史订单数" value={detailItem.totalOrderCount ?? detailItem.totalOrders} />
            <DetailRow label="历史订单金额" value={(detailItem.totalOrderAmount ?? detailItem.totalAmount)?.toLocaleString("zh-CN")} />
            <DetailRow label="创建时间" value={detailItem.createdAt} />
            <DetailRow label="更新时间" value={detailItem.updatedAt} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ color: "#999", minWidth: 100, flexShrink: 0 }}>{label}：</span>
      <span>{value ?? "-"}</span>
    </div>
  );
}
