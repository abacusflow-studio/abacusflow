"use client";

import React, { useState } from "react";
import { PageHeader, Button, DataTable, type DataTableColumn } from "@abacusflow/ui";
import { customerApi, type Customer } from "@abacusflow/core";

export default function CustomersPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await customerApi.listCustomersPage({
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
    if (!confirm("确定删除该客户？")) return;
    try {
      await customerApi.deleteCustomer(id);
      fetchData();
    } catch (err) {
      console.error(err);
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
        title="客户管理"
        extra={<Button type="primary" label="新增客户" onClick={() => {}} />}
      />
      <div className="card">
        <div className="form-inline" style={{ marginBottom: 16 }}>
          <div className="form-item">
            <label>客户名称</label>
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="请输入客户名称"
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
