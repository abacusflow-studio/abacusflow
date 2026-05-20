"use client";

import React, { useState } from "react";
import { PageHeader, Button, DataTable, type DataTableColumn } from "@abacusflow/ui";
import { productApi, type BasicProduct, type Product } from "@abacusflow/core";
import { translateProductType, translateProductUnit } from "@abacusflow/utils";

export default function ProductsPage() {
  const [data, setData] = useState<BasicProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await productApi.listBasicProductsPage({
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
    if (!confirm("确定删除该产品？")) return;
    try {
      await productApi.deleteProduct(id);
      fetchData();
    } catch (err) {
      console.error(err);
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
          <Button type="link" label="编辑" onClick={() => {}} />
          <Button type="link" label="删除" onClick={() => handleDelete(record.id)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="产品管理"
        extra={<Button type="primary" label="新增产品" onClick={() => {}} />}
      />
      <div className="card">
        <div className="form-inline" style={{ marginBottom: 16 }}>
          <div className="form-item">
            <label>产品名称</label>
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="请输入产品名称"
            />
          </div>
          <Button type="primary" label="搜索" onClick={() => { setPageIndex(1); fetchData(); }} />
          <Button
            label="重置"
            onClick={() => {
              setSearchName("");
              setPageIndex(1);
            }}
          />
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
