"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Result, Spin, Typography, App } from "antd";
import { MailOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { tenantApi } from "@abacusflow/core";

const { Text, Title } = Typography;

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [tenantName, setTenantName] = useState<string>("");
  const [error, setError] = useState<string>("");

  const token = searchParams.get("token");

  const acceptInvitation = useCallback(async () => {
    if (!token) {
      setError("邀请链接无效：缺少 token 参数");
      setLoading(false);
      return;
    }

    try {
      const result = await tenantApi.acceptTenantInvitation({
        acceptTenantInvitationInput: { token },
      });
      setTenantName(result.tenantName);
      setSuccess(true);
      message.success("已成功加入租户");
    } catch (err) {
      setError(err instanceof Error ? err.message : "接受邀请失败");
    } finally {
      setLoading(false);
    }
  }, [token, message]);

  useEffect(() => {
    void acceptInvitation();
  }, [acceptInvitation]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "var(--colorBgLayout, #f1f5f9)",
        }}
      >
        <Spin size="large" tip="正在接受邀请..." />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "var(--colorBgLayout, #f1f5f9)",
          padding: 24,
        }}
      >
        <Card style={{ maxWidth: 480, width: "100%" }}>
          <Result
            status="error"
            title="接受邀请失败"
            subTitle={error}
            extra={[
              <Button key="home" type="primary" onClick={() => router.replace("/dashboard")}>
                返回首页
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "var(--colorBgLayout, #f1f5f9)",
          padding: 24,
        }}
      >
        <Card style={{ maxWidth: 480, width: "100%" }} styles={{ body: { padding: "40px 32px" } }}>
          <div style={{ textAlign: "center" }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: "#52c41a", marginBottom: 16 }} />
            <Title level={3} style={{ marginBottom: 8 }}>
              成功加入租户
            </Title>
            <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
              您已成功加入「{tenantName}」租户
            </Text>
            <Button type="primary" size="large" onClick={() => router.replace("/dashboard")}>
              进入工作台
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
