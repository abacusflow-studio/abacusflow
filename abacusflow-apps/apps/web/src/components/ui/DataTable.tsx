"use client";

import React from "react";
import { Table } from "antd";
import type { TableProps } from "antd";

export interface DataTableLabels {
  loading?: string;
  empty?: string;
  total?: string;
  prev?: string;
  next?: string;
}

export interface DataTableColumn<T> {
  key: string;
  title: string;
  dataIndex?: keyof T & string;
  width?: number;
  ellipsis?: boolean;
  render?: (
    value: T[keyof T] | undefined,
    record: T,
    index: number,
  ) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey?: (keyof T & string) | ((record: T) => string | number);
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  labels?: DataTableLabels;
}

export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  pagination,
}: DataTableProps<T>) {
  const antColumns: TableProps<T>["columns"] = columns.map((col) => ({
    key: col.key,
    title: col.title,
    dataIndex: col.dataIndex ? [col.dataIndex as string] : undefined,
    width: col.width,
    ellipsis: col.ellipsis,
    render: col.render
      ? (_: unknown, record: T, index: number) => {
          const cellValue = col.dataIndex ? record[col.dataIndex] : undefined;
          return col.render!(
            cellValue as T[keyof T] | undefined,
            record,
            index,
          );
        }
      : undefined,
  }));

  const antPagination: TableProps<T>["pagination"] = pagination
    ? {
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: pagination.onChange,
        showTotal: (total: number) => `共 ${total} 条`,
        showSizeChanger: false,
      }
    : false;

  const rowKeyFn =
    typeof rowKey === "function"
      ? rowKey
      : rowKey
        ? (record: T) => String(record[rowKey as keyof T])
        : (_: T, index?: number) => String(index ?? 0);

  return (
    <Table<T>
      columns={antColumns}
      dataSource={data}
      rowKey={rowKeyFn}
      loading={loading}
      pagination={antPagination}
      size="middle"
    />
  );
}
