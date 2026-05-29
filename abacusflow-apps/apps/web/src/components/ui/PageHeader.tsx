"use client";

import React from "react";
import { Flex, Typography } from "antd";

interface PageHeaderProps {
  title: string;
  extra?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, extra }) => {
  return (
    <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
      {extra && <div>{extra}</div>}
    </Flex>
  );
};
