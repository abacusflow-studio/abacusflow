'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Form, Input, Card, Typography, message } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { tenantApi } from '@abacusflow/core';
import { useTenant } from '../../components/tenant-provider';

const { Title, Text } = Typography;

export default function OnboardingPage() {
  const router = useRouter();
  const { setBootstrapData } = useTenant();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { name: string; displayName?: string }) => {
    setLoading(true);
    try {
      const tenant = await tenantApi.createTenant({
        createTenantInput: {
          name: values.name,
          displayName: values.displayName || undefined,
        },
      });
      setBootstrapData('SINGLE_TENANT', [tenant], tenant.tenantId);
      message.success('租户创建成功');
      router.replace('/dashboard');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建租户失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--colorBgLayout, #f1f5f9)',
        padding: 24,
      }}
    >
      <Card
        style={{ maxWidth: 480, width: '100%' }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <ShopOutlined style={{ fontSize: 48, color: '#16a34a', marginBottom: 16 }} />
          <Title level={3} style={{ marginBottom: 8 }}>
            创建您的租户
          </Title>
          <Text type="secondary">
            首次使用需要创建一个租户来管理您的业务数据
          </Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="租户名称"
            rules={[
              { required: true, message: '请输入租户名称' },
              { max: 50, message: '租户名称不能超过50个字符' },
            ]}
          >
            <Input
              placeholder="例如：我的公司"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="显示名称"
            extra="可选，用于界面展示"
          >
            <Input
              placeholder="例如：我的公司有限公司"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              创建租户
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
