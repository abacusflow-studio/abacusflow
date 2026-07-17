export function translateTenantStatus(value?: string): string {
  if (value === 'ACTIVE') return '正常';
  if (value === 'SUSPENDED') return '已暂停';
  if (value === 'DEPROVISIONED') return '已注销';
  return value ?? '-';
}

export function tenantStatusColor(value?: string): string {
  if (value === 'ACTIVE') return 'success';
  if (value === 'SUSPENDED') return 'warning';
  if (value === 'DEPROVISIONED') return 'error';
  return 'default';
}

export function formatTimestamp(ts?: number | null): string {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('zh-CN');
}
