"use client";

import React, { useState } from "react";
import { PageHeader, Button, DataTable, type DataTableColumn } from "@abacusflow/ui";
import { inventoryApi, type InventoryUnit } from "@abacusflow/core";
import { translateProductUnit, translateProductType } from "@abacusflow/utils";

export default function InventoryPage() {
  const [data, setData] = useState<InventoryUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.listInventoriesPage({
        pageIndex,
        pageSize: 10,
        productName: searchName || undefined,
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

  const columns: DataTableColumn<InventoryUnit>[] = [
    { key: "productName", title: "产品名称", dataIndex: "productName" },
    {
      key: "productUnit",
      title: "单位",
      render: (_, record) => translateProductUnit(record.productUnit),
    },
    {
      key: "productType",
      title: "产品类型",
      render: (_, record) => translateProductType(record.productType),
    },
    { key: "categoryName", title: "产品类别", dataIndex: "categoryName" },
    { key: "depotName", title: "储存点", dataIndex: "depotName" },
    { key: "quantity", title: "库存数量", dataIndex: "quantity" },
    {
      key: "health",
      title: "库存健康",
      render: (_, record) => {
        if (record.safetyStock && record.quantity < record.safetyStock) {
          return <span style={{ color: "#ff4d4f" }}>⚠️ 低于安全库存</span>;
        }
        if (record.maxStock && record.quantity > record.maxStock) {
          return <span style={{ color: "#fa8c16" }}>⚠️ 超出最大库存</span>;
        }
        return <span style={{ color: "#52c41a" }}>✅ 正常</span>;
      },
    },
    {
      key: "action",
      title: "操作",
      render: () => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="link" label="分配储存点" onClick={() => {}} />
          <Button type="link" label="调整预警线" onClick={() => {}} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="库存管理" />
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
