"use client";

import React from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface DataTableColumn<T = any> {
  key: string;
  title: string;
  dataIndex?: keyof T & string;
  width?: number;
  ellipsis?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

interface DataTableProps<T = any> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey?: keyof T & string | ((record: T) => string | number);
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

function getRowKey<T>(record: T, index: number, rowKey?: string | ((record: T) => string | number)): string | number {
  if (!rowKey) return index;
  if (typeof rowKey === "function") return rowKey(record);
  return ((record as any)[rowKey] as string | number) ?? index;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  pagination,
}: DataTableProps<T>) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 14,
        }}
      >
        <thead>
          <tr style={{ borderBottom: "1px solid #f0f0f0", textAlign: "left" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "12px 8px",
                  fontWeight: 600,
                  color: "#595959",
                  width: col.width,
                  whiteSpace: col.ellipsis ? "nowrap" : undefined,
                  overflow: col.ellipsis ? "hidden" : undefined,
                  textOverflow: col.ellipsis ? "ellipsis" : undefined,
                }}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", padding: 32, color: "#999" }}>
                加载中...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", padding: 32, color: "#999" }}>
                暂无数据
              </td>
            </tr>
          ) : (
            data.map((record, index) => (
              <tr
                key={getRowKey(record, index, rowKey as any)}
                style={{ borderBottom: "1px solid #f0f0f0" }}
              >
                {columns.map((col) => {
                  const cellValue = col.dataIndex ? (record as any)[col.dataIndex] : undefined;
                  return (
                    <td
                      key={col.key}
                      style={{
                        padding: "12px 8px",
                        whiteSpace: col.ellipsis ? "nowrap" : undefined,
                        overflow: col.ellipsis ? "hidden" : undefined,
                        textOverflow: col.ellipsis ? "ellipsis" : undefined,
                        maxWidth: col.ellipsis ? 200 : undefined,
                      }}
                    >
                      {col.render
                        ? col.render(cellValue, record, index)
                        : col.dataIndex
                          ? String(cellValue ?? "")
                          : null}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {pagination && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "12px 0",
            gap: 8,
            fontSize: 13,
          }}
        >
          <span style={{ color: "#999" }}>共 {pagination.total} 条</span>
          <button
            disabled={pagination.current <= 1}
            onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
            style={{ padding: "4px 10px", cursor: "pointer" }}
          >
            上一页
          </button>
          <span>
            {pagination.current} / {Math.ceil(pagination.total / pagination.pageSize) || 1}
          </span>
          <button
            disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
            onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
            style={{ padding: "4px 10px", cursor: "pointer" }}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
