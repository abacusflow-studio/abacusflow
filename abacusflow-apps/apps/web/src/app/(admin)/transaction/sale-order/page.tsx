"use client";

import React, { useState } from "react";
import { PageHeader, Button, DataTable, StatusTag, type DataTableColumn } from "@abacusflow/ui";
import { transactionApi, type SaleOrder } from "@abacusflow/core";
import { dateToFormattedString } from "@abacusflow/utils";

export default function SaleOrdersPage() {
  const [data, setData] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchOrderNo, setSearchOrderNo] = useState("");
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await transactionApi.listSaleOrdersPage({
        pageIndex,
        pageSize: 10,
        orderNo: searchOrderNo || undefined,
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

  const handleAction = async (id: number, action: "complete" | "cancel" | "reverse") => {
    const labels = { complete: "完成", cancel: "取消", reverse: "撤回" };
    if (!confirm(`确定${labels[action]}该销售单？`)) return;
    try {
      if (action === "complete") await transactionApi.completeSaleOrder(id);
      if (action === "cancel") await transactionApi.cancelSaleOrder(id);
      if (action === "reverse") await transactionApi.reverseSaleOrder(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const columns: DataTableColumn<SaleOrder>[] = [
    { key: "orderNo", title: "订单编号", dataIndex: "orderNo" },
    {
      key: "orderDate",
      title: "订单日期",
      render: (_, record) => dateToFormattedString(record.orderDate),
    },
    { key: "customerName", title: "客户", dataIndex: "customerName" },
    {
      key: "status",
      title: "状态",
      render: (_, record) => <StatusTag status={record.status} />,
    },
    {
      key: "totalAmount",
      title: "总金额",
      render: (_, record) => record.totalAmount?.toLocaleString("zh-CN") ?? "-",
    },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="link" label="详情" onClick={() => {}} />
          {record.status === "pending" && (
            <>
              <Button type="link" label="完成" onClick={() => handleAction(record.id, "complete")} />
              <Button type="link" label="取消" onClick={() => handleAction(record.id, "cancel")} />
            </>
          )}
          {record.status === "completed" && (
            <Button type="link" label="撤回" onClick={() => handleAction(record.id, "reverse")} />
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="销售单管理"
        extra={<Button type="primary" label="新增销售单" onClick={() => {}} />}
      />
      <div className="card">
        <div className="form-inline" style={{ marginBottom: 16 }}>
          <div className="form-item">
            <label>订单编号</label>
            <input
              value={searchOrderNo}
              onChange={(e) => setSearchOrderNo(e.target.value)}
              placeholder="请输入订单编号"
            />
          </div>
          <Button type="primary" label="搜索" onClick={() => { setPageIndex(1); fetchData(); }} />
          <Button label="重置" onClick={() => { setSearchOrderNo(""); setPageIndex(1); }} />
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
