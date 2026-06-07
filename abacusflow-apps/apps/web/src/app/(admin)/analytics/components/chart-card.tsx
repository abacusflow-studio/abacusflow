"use client";

import React from "react";
import { Card, Spin, Typography } from "antd";

const { Text } = Typography;

export function ChartCard({
  title,
  loading,
  error,
  height = 260,
  children,
}: {
  title: string;
  loading: boolean;
  error: string | null;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <Card
      title={<span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>}
      size="small"
      style={{ flex: 1, minWidth: 0 }}
    >
      {loading ? (
        <div
          style={{
            height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spin />
        </div>
      ) : error ? (
        <div
          style={{
            height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            {error}
          </Text>
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </Card>
  );
}
