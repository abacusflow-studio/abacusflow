import React from "react";
// 从我们自己的 utils 包中导入函数！
import { capitalize } from "@abacusflow/utils";

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 20px",
        fontSize: "16px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        cursor: "pointer",
        backgroundColor: "#f0f0f0",
      }}
    >
      {/* 使用共享的 capitalize 函数 */}
      {capitalize(label)}
    </button>
  );
};
