"use client";

import React from "react";
import type { OrderStatus } from "@abacusflow/utils";
import { translateOrderStatus, STATUS_COLORS } from "@abacusflow/utils";

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
