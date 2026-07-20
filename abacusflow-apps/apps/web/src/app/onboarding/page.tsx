'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { tenantApi } from '@abacusflow/core';

const { Title, Text } = Typography;

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const acceptInvitation = async ({ token }: { token: string }) => {
    setLoading(true);
    try {
      await tenantApi.acceptTenantInvitation({ acceptTenantInvitationInput: { token: token.trim() } });
      message.success('邀请已接受，租户空间已为你开放');
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '邀请无效或身份邮箱不匹配');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: 24 }}>
      <Card style={{ maxWidth: 520, width: '100%' }} styles={{ body: { padding: '40px 32px' } }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <MailOutlined style={{ fontSize: 46, color: '#16a34a', marginBottom: 16 }} />
          <Title level={3}>等待租户邀请</Title>
          <Text type="secondary">
            租户只能由平台管理员创建。请使用发送到你已验证邮箱的邀请 token 加入租户。
          </Text>
        </div>
        <Form layout="vertical" onFinish={acceptInvitation}>
          <Form.Item name="token" label="邀请 token" rules={[{ required: true, message: '请输入邀请 token' }]}>
            <Input.TextArea rows={3} placeholder="粘贴邀请 token" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            接受邀请
          </Button>
        </Form>
      </Card>
    </div>
  );
}
