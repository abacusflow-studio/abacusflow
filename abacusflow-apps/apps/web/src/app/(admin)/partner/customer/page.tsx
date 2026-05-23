"use client";

import React, { useState } from "react";
import {
  PageHeader, Button, DataTable, Modal,
  FormField, FormInput,
  type DataTableColumn,
} from "@abacusflow/ui";
import { customerApi, type Customer, type CreateCustomerRequest } from "@abacusflow/core";
import { isNonEmpty, isValidPhone } from "@abacusflow/utils";
import { usePaginatedList } from "../../../../hooks/use-paginated-list";
import { useToast } from "../../../../hooks/use-toast";

interface CustomerForm {
  name: string;
  phone: string;
  address: string;
}

const emptyForm: CustomerForm = { name: "", phone: "", address: "" };

export default function CustomersPage() {
  const { addToast } = useToast();
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Customer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const {
    data, loading, pageIndex, total, filters,
    updateFilter, setPageIndex, refresh, handleSearch, handleReset,
  } = usePaginatedList<Customer, { name?: string; phone?: string; address?: string }>({
    fetchFn: (params) =>
      customerApi.listCustomersPage(params as Parameters<typeof customerApi.listCustomersPage>[0]),
    defaultFilters: { name: undefined, phone: undefined, address: undefined },
  });

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (record: Customer) => {
    setEditItem(record);
    setForm({
      name: record.name,
      phone: record.phone ?? "",
      address: record.address ?? "",
    });
    setErrors({});
    setShowForm(true);
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await customerApi.getCustomer(id);
      setDetailItem(item);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "加载失败");
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CustomerForm, string>> = {};
    if (!isNonEmpty(form.name)) newErrors.name = "请输入客户名称";
    if (form.phone && !isValidPhone(form.phone)) newErrors.phone = "请输入正确的手机号";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: CreateCustomerRequest = {
        name: form.name,
        phone: form.phone || undefined,
        address: form.address || undefined,
      };
      if (editItem) {
        await customerApi.updateCustomer({ ...payload, id: editItem.id });
        addToast("success", "编辑成功");
      } else {
        await customerApi.createCustomer(payload);
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
        title="客户管理"
        extra={<Button type="primary" label="新增客户" onClick={openCreate} />}
      />
      <div className="card">
        <div className="form-inline mb-4">
          <div className="form-item">
            <label>客户名称</label>
            <input
              value={filters.name ?? ""}
              onChange={(e) => updateFilter("name", e.target.value || undefined)}
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
          pagination={{ current: pageIndex, pageSize: 10, total, onChange: setPageIndex }}
        />
      </div>

      <Modal
        open={showForm}
        title={editItem ? "编辑客户" : "新增客户"}
        onClose={() => setShowForm(false)}
        onOk={handleSubmit}
        okLoading={submitting}
        width={520}
      >
        <FormField label="客户名称" required error={errors.name}>
          <FormInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="请输入客户名称"
            error={!!errors.name}
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
        title="客户详情"
        onClose={() => setShowDetail(false)}
        width={520}
      >
        {detailLoading ? (
          <p className="text-gray-400 text-center py-8">加载中...</p>
        ) : detailItem ? (
          <div className="flex flex-col gap-3">
            <DetailRow label="客户名称" value={detailItem.name} />
            <DetailRow label="联系电话" value={detailItem.phone} />
            <DetailRow label="地址" value={detailItem.address} />
            <DetailRow label="历史订单数" value={detailItem.totalOrders} />
            <DetailRow label="历史订单金额" value={detailItem.totalAmount?.toLocaleString("zh-CN")} />
            <DetailRow label="创建时间" value={detailItem.createdAt} />
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
