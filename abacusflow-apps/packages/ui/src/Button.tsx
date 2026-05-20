"use client";

import React from "react";

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
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: "1px solid #d9d9d9",
    borderRadius: 6,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    fontWeight: 500,
    transition: "all 0.2s",
    width: block ? "100%" : undefined,
    opacity: disabled ? 0.5 : 1,
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    small: { padding: "2px 8px", fontSize: 12 },
    middle: { padding: "6px 16px", fontSize: 14 },
    large: { padding: "10px 24px", fontSize: 16 },
  };

  const typeStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: "#1677ff",
      borderColor: "#1677ff",
      color: "#fff",
    },
    default: {
      backgroundColor: "#fff",
      borderColor: "#d9d9d9",
      color: "#000",
    },
    link: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      color: "#1677ff",
      padding: 0,
    },
    danger: {
      backgroundColor: "#fff",
      borderColor: "#ff4d4f",
      color: "#ff4d4f",
    },
  };

  return (
    <button
      type={htmlType}
      onClick={onClick}
      disabled={disabled || loading}
      style={{ ...baseStyle, ...sizeStyles[size], ...typeStyles[type] }}
    >
      {loading && <span style={{ marginRight: 4 }}>⟳</span>}
      {children || label}
    </button>
  );
};
