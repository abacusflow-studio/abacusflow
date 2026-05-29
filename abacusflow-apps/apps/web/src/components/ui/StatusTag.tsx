"use client";

import React from "react";
import { Tag } from "antd";
import { STATUS_COLORS } from "@abacusflow/utils";
import type { OrderStatus } from "@abacusflow/utils";
import { translateOrderStatus } from "@abacusflow/utils";

interface StatusTagProps {
  status: OrderStatus;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status }) => {
  const colors = STATUS_COLORS[status] || { bg: "#f0f0f0", color: "#000" };
  return (
    <Tag color={colors.color} style={{ backgroundColor: colors.bg }}>
      {translateOrderStatus(status)}
    </Tag>
  );
};
