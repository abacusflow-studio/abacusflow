"use client";

import React from "react";

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> {
  error?: boolean;
}

export function FormInput({ error, ...props }: FormInputProps) {
  return (
    <input
      {...props}
      style={{
        padding: "6px 12px",
        border: `1px solid ${error ? "#ff4d4f" : "#d9d9d9"}`,
        borderRadius: 6,
        fontSize: 14,
        outline: "none",
        transition: "border-color 0.2s",
        width: "100%",
      }}
    />
  );
}
