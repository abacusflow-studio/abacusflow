import assert from 'node:assert/strict';
import test from 'node:test';
import { isTenantScopedApiUrl } from './tenant.ts';

test('tenant headers are attached to tenant business and administration APIs', () => {
  assert.equal(isTenantScopedApiUrl('https://api.example/products?page=0'), true);
  assert.equal(isTenantScopedApiUrl('/api/products?page=0'), true);
  assert.equal(isTenantScopedApiUrl('/product-categories/selectable'), true);
  assert.equal(isTenantScopedApiUrl('/tenant/members'), true);
});

test('tenant-neutral bootstrap and platform APIs never receive a cached tenant header', () => {
  assert.equal(isTenantScopedApiUrl('/me/bootstrap'), false);
  assert.equal(isTenantScopedApiUrl('/api/me/bootstrap'), false);
  assert.equal(isTenantScopedApiUrl('/me/tenants'), false);
  assert.equal(isTenantScopedApiUrl('/me/invitations/accept'), false);
  assert.equal(isTenantScopedApiUrl('/platform/tenants'), false);
  assert.equal(isTenantScopedApiUrl('/users'), false);
});
