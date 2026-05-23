"use client";

import React from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
      <label style={{ fontSize: 13, color: "#666", fontWeight: 500 }}>
        {label}
        {required && <span style={{ color: "#ff4d4f", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <span style={{ fontSize: 12, color: "#ff4d4f" }}>{error}</span>}
    </div>
  );
}
