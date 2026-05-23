"use client";

import React from "react";
import { Button as AntButton } from "antd";
import type { ButtonProps as AntButtonProps } from "antd";

interface ButtonProps {
  label: string;
  onClick?: () => void;
  type?: "primary" | "default" | "link" | "danger";
  size?: "small" | "middle" | "large";
  loading?: boolean;
  disabled?: boolean;
  htmlType?: "button" | "submit" | "reset";
  block?: boolean;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  type = "default",
  size = "middle",
  loading = false,
  disabled = false,
  htmlType = "button",
  block = false,
  children,
}) => {
  const antType: AntButtonProps["type"] =
    type === "danger" ? "default" : type === "default" ? "default" : type;

  return (
    <AntButton
      type={antType}
      danger={type === "danger"}
      size={size === "middle" ? "middle" : size}
      loading={loading}
      disabled={disabled}
      htmlType={htmlType}
      block={block}
      onClick={onClick}
    >
      {children || label}
    </AntButton>
  );
};
