'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, Typography, List } from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import { useTenant } from '../../../components/tenant-provider';

const { Title, Text } = Typography;

export default function TenantSelectPage() {
  const router = useRouter();
  const { tenants, selectTenant } = useTenant();

  const handleSelect = (tenantId: number) => {
    selectTenant(tenantId);
    router.replace('/dashboard');
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
        style={{ maxWidth: 520, width: '100%' }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <ShopOutlined style={{ fontSize: 48, color: '#16a34a', marginBottom: 16 }} />
          <Title level={3} style={{ marginBottom: 8 }}>
            选择租户
          </Title>
          <Text type="secondary">
            您属于多个租户，请选择要进入的租户
          </Text>
        </div>

        <List
          dataSource={tenants}
          renderItem={(tenant) => (
            <List.Item
              style={{
                cursor: 'pointer',
                borderRadius: 12,
                padding: '16px 20px',
                margin: '4px 0',
                transition: 'background 0.2s',
              }}
              onClick={() => handleSelect(tenant.tenantId)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--colorBgTextHover, rgba(22, 163, 74, 0.06))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <List.Item.Meta
                avatar={
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'var(--colorPrimaryBg, rgba(22, 163, 74, 0.12))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#16a34a',
                      fontWeight: 700,
                      fontSize: 18,
                    }}
                  >
                    {(tenant.displayName || tenant.name).charAt(0).toUpperCase()}
                  </div>
                }
                title={tenant.displayName || tenant.name}
                description={tenant.roleNames.length > 0 ? tenant.roleNames.join(', ') : undefined}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
