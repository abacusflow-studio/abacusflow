"use client";

import React, { useState } from "react";
import { PageHeader, Button, DataTable, type DataTableColumn } from "@abacusflow/ui";
import { depotApi, type BasicDepot } from "@abacusflow/core";

export default function DepotsPage() {
  const [data, setData] = useState<BasicDepot[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");

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

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该储存点？")) return;
    try {
      await depotApi.deleteDepot(id);
      fetchData();
    } catch (err) {
      console.error(err);
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
          <Button type="link" label="编辑" onClick={() => {}} />
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
        extra={<Button type="primary" label="新增储存点" onClick={() => {}} />}
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
    </div>
  );
}
