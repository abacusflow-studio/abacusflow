"use client";

import { Result } from "antd";

export default function ForbiddenPage() {
  return (
    <Result
      status="403"
      title="无权访问"
      subTitle="后端拒绝了当前操作。请切换到具有相应权限的租户，或联系管理员调整角色权限。"
    />
  );
}
