"use client";

import React from "react";

interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "style"> {
  options: { label: string; value: string | number }[];
  placeholder?: string;
  error?: boolean;
}

export function FormSelect({ options, placeholder, error, ...props }: FormSelectProps) {
  return (
    <select
      {...props}
      style={{
        padding: "6px 12px",
        border: `1px solid ${error ? "#ff4d4f" : "#d9d9d9"}`,
        borderRadius: 6,
        fontSize: 14,
        outline: "none",
        transition: "border-color 0.2s",
        width: "100%",
        backgroundColor: "#fff",
      }}
    >
      {placeholder && (
        <option value="">{placeholder}</option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
