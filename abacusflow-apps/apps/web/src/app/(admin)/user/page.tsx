"use client";

import React, { useState } from "react";
import { PageHeader, Button, DataTable, type DataTableColumn } from "@abacusflow/ui";
import { userApi, type User } from "@abacusflow/core";

export default function UsersPage() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await userApi.listUsersPage({
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
    if (!confirm("确定删除该用户？")) return;
    try {
      await userApi.deleteUser(id);
      fetchData();
    } catch (err) {
      console.error(err);
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
              <Button type="link" label="编辑" onClick={() => {}} />
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
        extra={<Button type="primary" label="新增用户" onClick={() => {}} />}
      />
      <div className="card">
        <div className="form-inline" style={{ marginBottom: 16 }}>
          <div className="form-item">
            <label>用户名</label>
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="请输入用户名"
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
