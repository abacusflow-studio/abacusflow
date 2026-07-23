"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Alert,
  Button,
  Card,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  CheckOutlined,
  MailOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { tenantApi, userApi, type TenantInvitation } from "@abacusflow/core";
import { resolveInvitationOnboardingState } from "@/lib/tenant-bootstrap";

const { Paragraph, Text, Title } = Typography;

export default function OnboardingPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [invitations, setInvitations] = useState<TenantInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [canReturnToSystem, setCanReturnToSystem] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);

  const loadInvitations = useCallback(async () => {
    setLoading(true);
    try {
      // Bootstrap first: for an unverified identity this refreshes the profile
      // from the OIDC provider before invitation discovery is authorized.
      const bootstrap = await userApi.bootstrap();
      setEmail(bootstrap.email ?? null);
      setEmailVerified(bootstrap.emailVerified);

      const memberships = await tenantApi.listMyTenants();
      setCanReturnToSystem(
        memberships.length > 0 || (bootstrap.platformPermissions?.length ?? 0) > 0,
      );

      if (!bootstrap.emailVerified) {
        setInvitations([]);
        return;
      }

      setInvitations(await tenantApi.listMyInvitations());
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载租户邀请失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const onboardingState =
    emailVerified === null
      ? null
      : resolveInvitationOnboardingState(emailVerified, invitations.length);

  const removeInvitation = (invitationId: number) => {
    setInvitations((current) => current.filter((item) => item.id !== invitationId));
  };

  const acceptInvitation = async (invitation: TenantInvitation) => {
    setActingId(invitation.id);
    try {
      await tenantApi.acceptMyTenantInvitation({ invitationId: invitation.id });
      removeInvitation(invitation.id);
      setCanReturnToSystem(true);
      message.success(`已加入「${invitation.tenantName}」`);
      if (invitations.length === 1) {
        router.replace("/dashboard");
        router.refresh();
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : "接受邀请失败");
    } finally {
      setActingId(null);
    }
  };

  const declineInvitation = async (invitation: TenantInvitation) => {
    setActingId(invitation.id);
    try {
      await tenantApi.declineMyTenantInvitation({ invitationId: invitation.id });
      removeInvitation(invitation.id);
      message.success(`已拒绝「${invitation.tenantName}」的邀请`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "拒绝邀请失败");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "48px 24px",
        background: "var(--colorBgLayout, #f1f5f9)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <MailOutlined style={{ fontSize: 48, color: "#16a34a", marginBottom: 16 }} />
          <Title level={2} style={{ marginBottom: 8 }}>
            租户邀请
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {emailVerified === false
              ? "邀请可以先发送到你的邮箱；验证邮箱所有权后即可在这里接受或拒绝，无需输入 token。"
              : "以下邀请已通过你的登录邮箱完成身份匹配，请确认是否加入。无需输入邀请 token。"}
          </Paragraph>
        </div>

        {loading ? (
          <Card>
            <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
              <Spin size="large" tip="正在查询你的邀请..." />
            </div>
          </Card>
        ) : onboardingState === "VERIFY_EMAIL" ? (
          <Card styles={{ body: { padding: "36px 32px" } }}>
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              <div style={{ textAlign: "center" }}>
                <SafetyCertificateOutlined
                  style={{ fontSize: 42, color: "#d97706", marginBottom: 16 }}
                />
                <Title level={3} style={{ marginBottom: 8 }}>
                  请先验证登录邮箱
                </Title>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  {email
                    ? <>当前邮箱 <Text code>{email}</Text> 尚未通过身份服务验证。</>
                    : "当前登录身份没有可验证的邮箱。"}
                </Paragraph>
              </div>

              <Alert
                type="warning"
                showIcon
                message="邀请不会丢失"
                description={
                  email
                    ? "管理员现在就可以邀请这个邮箱，邀请会保持待处理；系统只会在邮箱验证完成后展示并允许接受或拒绝。请先完成身份服务发送的邮箱验证，然后点击下方按钮。"
                    : "系统无法在没有已验证邮箱的情况下安全匹配邀请。请先在身份服务中补充并验证邮箱，再回来重新检查。"
                }
              />

              <div style={{ textAlign: "center" }}>
                <Space wrap>
                  {canReturnToSystem && (
                    <Button onClick={() => router.replace("/dashboard")}>返回系统</Button>
                  )}
                  <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={() => void loadInvitations()}
                  >
                    我已完成验证，重新检查
                  </Button>
                </Space>
              </div>
            </Space>
          </Card>
        ) : onboardingState === "NO_PENDING_INVITATIONS" ? (
          <Card styles={{ body: { padding: "48px 32px" } }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size={4}>
                  <Text strong>当前没有待处理邀请</Text>
                  <Text type="secondary">如需加入租户，请联系租户管理员向你的登录邮箱发出邀请。</Text>
                </Space>
              }
            >
              <Button
                type="primary"
                onClick={() => {
                  if (canReturnToSystem) {
                    router.replace("/dashboard");
                  } else {
                    void loadInvitations();
                  }
                }}
              >
                {canReturnToSystem ? "返回系统" : "重新检查邀请"}
              </Button>
            </Empty>
          </Card>
        ) : onboardingState === "PENDING_INVITATIONS" ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {invitations.map((invitation) => (
              <Card key={invitation.id} styles={{ body: { padding: 24 } }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 24,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: "1 1 320px", minWidth: 0 }}>
                    <Space size={8} wrap style={{ marginBottom: 10 }}>
                      <Title level={4} style={{ margin: 0 }}>
                        {invitation.tenantName}
                      </Title>
                      {invitation.initialAdministrator && <Tag color="purple">首位租户管理员</Tag>}
                    </Space>
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary">邀请角色：</Text>
                      {invitation.roleNames.length > 0 ? (
                        invitation.roleNames.map((role) => <Tag key={role}>{role}</Tag>)
                      ) : (
                        <Tag>默认成员</Tag>
                      )}
                    </div>
                    <Text type="secondary">
                      邀请有效期至 {new Date(invitation.expiresAt).toLocaleString()}
                    </Text>
                  </div>
                  <Space>
                    <Popconfirm
                      title="拒绝这个邀请？"
                      description={
                        invitation.initialAdministrator
                          ? "拒绝后租户会继续保持待激活，平台管理员需要重新邀请。"
                          : "拒绝后如需加入，租户管理员必须重新邀请。"
                      }
                      okText="确认拒绝"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => declineInvitation(invitation)}
                    >
                      <Button
                        danger
                        icon={<StopOutlined />}
                        disabled={actingId !== null}
                        loading={actingId === invitation.id}
                      >
                        拒绝
                      </Button>
                    </Popconfirm>
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      disabled={actingId !== null}
                      loading={actingId === invitation.id}
                      onClick={() => acceptInvitation(invitation)}
                    >
                      接受并加入
                    </Button>
                  </Space>
                </div>
              </Card>
            ))}
          </Space>
        ) : null}
      </div>
    </div>
  );
}
