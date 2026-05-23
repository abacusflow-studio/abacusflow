"use client";

import React from "react";

interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "style"> {
  error?: boolean;
}

export function FormTextarea({ error, ...props }: FormTextareaProps) {
  return (
    <textarea
      {...props}
      style={{
        padding: "6px 12px",
        border: `1px solid ${error ? "#ff4d4f" : "#d9d9d9"}`,
        borderRadius: 6,
        fontSize: 14,
        outline: "none",
        transition: "border-color 0.2s",
        width: "100%",
        minHeight: 80,
        resize: "vertical",
      }}
    />
  );
}
