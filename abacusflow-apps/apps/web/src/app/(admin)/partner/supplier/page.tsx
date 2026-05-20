"use client";

import React, { useState } from "react";
import { PageHeader, Button, DataTable, type DataTableColumn } from "@abacusflow/ui";
import { supplierApi, type Supplier } from "@abacusflow/core";

export default function SuppliersPage() {
  const [data, setData] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await supplierApi.listSuppliersPage({
        pageIndex,
        pageSize: 10,
        name: searchName || undefined,
      });
      setData(res.content);
      setTotal(res.totalElements);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [pageIndex]);

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该供应商？")) return;
    try {
      await supplierApi.deleteSupplier(id);
      fetchData();
    } catch (err) {
      console.error(err);
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
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="link" label="编辑" onClick={() => {}} />
          <Button type="link" label="删除" onClick={() => handleDelete(record.id)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="供应商管理"
        extra={<Button type="primary" label="新增供应商" onClick={() => {}} />}
      />
      <div className="card">
        <div className="form-inline" style={{ marginBottom: 16 }}>
          <div className="form-item">
            <label>供应商名称</label>
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="请输入供应商名称"
            />
          </div>
          <Button type="primary" label="搜索" onClick={() => { setPageIndex(1); fetchData(); }} />
          <Button label="重置" onClick={() => { setSearchName(""); setPageIndex(1); }} />
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
    </div>
  );
}
