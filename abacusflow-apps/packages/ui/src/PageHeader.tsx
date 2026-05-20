"use client";

import React from "react";

interface PageHeaderProps {
  title: string;
  extra?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, extra }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h1>
      {extra && <div>{extra}</div>}
    </div>
  );
};
