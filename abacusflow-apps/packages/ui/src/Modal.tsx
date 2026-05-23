"use client";

import React from "react";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onOk?: () => void;
  okText?: string;
  cancelText?: string;
  okLoading?: boolean;
  width?: number;
  children: React.ReactNode;
}

export function Modal({
  open,
  title,
  onClose,
  onOk,
  okText = "确定",
  cancelText = "取消",
  okLoading = false,
  width = 520,
  children,
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          width,
          maxWidth: "90vw",
          maxHeight: "80vh",
          backgroundColor: "#fff",
          borderRadius: 8,
          boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              color: "#999",
              padding: "0 4px",
            }}
          >
            x
          </button>
        </div>
        <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
        {onOk && (
          <div
            style={{
              padding: "12px 24px",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            <button
              onClick={onClose}
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                border: "1px solid #d9d9d9",
                backgroundColor: "#fff",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={onOk}
              disabled={okLoading}
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                border: "1px solid #1677ff",
                backgroundColor: "#1677ff",
                color: "#fff",
                cursor: okLoading ? "not-allowed" : "pointer",
                fontSize: 14,
                opacity: okLoading ? 0.6 : 1,
              }}
            >
              {okLoading ? "处理中..." : okText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
