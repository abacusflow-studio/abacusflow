"use client";

import React from "react";
import type { OrderStatus } from "@abacusflow/utils";
import { translateOrderStatus } from "@abacusflow/utils";

const STATUS_COLORS: Record<OrderStatus, { bg: string; color: string }> = {
  pending: { bg: "#fff7e6", color: "#fa8c16" },
  completed: { bg: "#f6ffed", color: "#52c41a" },
  canceled: { bg: "#fff1f0", color: "#ff4d4f" },
  reversed: { bg: "#f0f0f0", color: "#8c8c8c" },
};

interface StatusTagProps {
  status: OrderStatus;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
  const colors = STATUS_COLORS[status] || { bg: "#f0f0f0", color: "#000" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 12,
        backgroundColor: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.color}30`,
      }}
    >
      {translateOrderStatus(status)}
    </span>
  );
};
