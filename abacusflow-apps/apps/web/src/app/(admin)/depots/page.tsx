"use client";

import React, { useState } from "react";
import {
  PageHeader, Button, DataTable, Modal,
  FormField, FormInput,
  type DataTableColumn,
} from "@abacusflow/ui";
import { depotApi, type BasicDepot, type Depot, type CreateDepotRequest } from "@abacusflow/core";
import { isNonEmpty } from "@abacusflow/utils";
import { useToast } from "../../../hooks/use-toast";

interface DepotForm {
  name: string;
  location: string;
  capacity: string;
}

const emptyForm: DepotForm = { name: "", location: "", capacity: "" };

export default function DepotsPage() {
  const { addToast } = useToast();
  const [data, setData] = useState<BasicDepot[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");

  const [editItem, setEditItem] = useState<BasicDepot | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DepotForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof DepotForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Depot | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await depotApi.listBasicDepots();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (record: BasicDepot) => {
    setEditItem(record);
    setForm({
      name: record.name,
      location: record.location ?? "",
      capacity: record.capacity?.toString() ?? "",
    });
    setErrors({});
    setShowForm(true);
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await depotApi.getDepot(id);
      setDetailItem(item);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "加载失败");
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof DepotForm, string>> = {};
    if (!isNonEmpty(form.name)) newErrors.name = "请输入储存点名称";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: CreateDepotRequest = {
        name: form.name,
        location: form.location || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      };
      if (editItem) {
        await depotApi.updateDepot({ ...payload, id: editItem.id, enabled: editItem.enabled });
        addToast("success", "编辑成功");
      } else {
        await depotApi.createDepot(payload);
        addToast("success", "新增成功");
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该储存点？")) return;
    try {
      await depotApi.deleteDepot(id);
      addToast("success", "删除成功");
      fetchData();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns: DataTableColumn<BasicDepot>[] = [
    { key: "name", title: "储存点名称", dataIndex: "name" },
    { key: "location", title: "储存点地址", dataIndex: "location" },
    { key: "capacity", title: "储存点容量", dataIndex: "capacity" },
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
          <Button type="link" label="详情" onClick={() => openDetail(record.id)} />
          <Button type="link" label="编辑" onClick={() => openEdit(record)} />
          <Button type="link" label="删除" onClick={() => handleDelete(record.id)} />
        </div>
      ),
    },
  ];

  const filtered = searchName
    ? data.filter((d) => d.name.includes(searchName))
    : data;

  return (
    <div>
      <PageHeader
        title="储存点管理"
        extra={<Button type="primary" label="新增储存点" onClick={openCreate} />}
      />
      <div className="card">
        <div className="form-inline" style={{ marginBottom: 16 }}>
          <div className="form-item">
            <label>关键字名称</label>
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="请输入关键字"
            />
          </div>
          <Button type="primary" label="搜索" onClick={fetchData} />
          <Button label="重置" onClick={() => setSearchName("")} />
        </div>
      </div>
      <div className="card">
        <DataTable
          columns={columns}
          data={filtered}
          rowKey="id"
          loading={loading}
        />
      </div>

      <Modal
        open={showForm}
        title={editItem ? "编辑储存点" : "新增储存点"}
        onClose={() => setShowForm(false)}
        onOk={handleSubmit}
        okLoading={submitting}
        width={520}
      >
        <FormField label="储存点名称" required error={errors.name}>
          <FormInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="请输入储存点名称"
            error={!!errors.name}
          />
        </FormField>
        <FormField label="地址">
          <FormInput
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="请输入地址"
          />
        </FormField>
        <FormField label="容量">
          <FormInput
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            placeholder="请输入容量"
          />
        </FormField>
      </Modal>

      <Modal
        open={showDetail}
        title="储存点详情"
        onClose={() => setShowDetail(false)}
        width={520}
      >
        {detailLoading ? (
          <p className="text-gray-400 text-center py-8">加载中...</p>
        ) : detailItem ? (
          <div className="flex flex-col gap-3">
            <DetailRow label="储存点名称" value={detailItem.name} />
            <DetailRow label="地址" value={detailItem.location} />
            <DetailRow label="容量" value={detailItem.capacity} />
            <DetailRow label="启用状态" value={detailItem.enabled ? "启用" : "禁用"} />
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
