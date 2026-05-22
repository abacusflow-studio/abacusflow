"use client";

import React from "react";
import { ToastContext, useToastState, type Toast, type ToastType } from "../hooks/use-toast";

const TOAST_COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: "#f6ffed", border: "#52c41a", text: "#389e0d" },
  error: { bg: "#fff1f0", border: "#ff4d4f", text: "#cf1322" },
  warning: { bg: "#fff7e6", border: "#fa8c16", text: "#d46b08" },
  info: { bg: "#e6f4ff", border: "#1677ff", text: "#0958d9" },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) {
  const colors = TOAST_COLORS[toast.type];
  return (
    <div
      style={{
        padding: "10px 16px",
        borderRadius: 8,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}40`,
        color: colors.text,
        fontSize: 14,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minWidth: 280,
        maxWidth: 420,
        animation: "slideIn 0.3s ease-out",
      }}
    >
      <span>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: colors.text,
          fontSize: 16,
          padding: 0,
          opacity: 0.6,
        }}
      >
        x
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, addToast, removeToast } = useToastState();

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
