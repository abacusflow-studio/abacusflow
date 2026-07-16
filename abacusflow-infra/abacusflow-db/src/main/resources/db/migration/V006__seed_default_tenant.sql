-- ============================================================
-- V006__seed_default_tenant.sql  创建默认租户并迁移现有角色关系
-- ============================================================

-- 创建默认租户
INSERT INTO tenant (id, name, display_name, status)
VALUES (1, 'default', '默认租户', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;

-- 创建默认租户位置
INSERT INTO tenant_placement (tenant_id, cell_id, storage_mode)
VALUES (1, 'cell-default-01', 'SHARED_CELL')
ON CONFLICT DO NOTHING;

-- 迁移现有 user_role 到 tenant_membership + tenant_membership_role
INSERT INTO tenant_membership (tenant_id, user_id, status)
SELECT 1, ur.user_id, 'ACTIVE'
FROM user_role ur
ON CONFLICT (tenant_id, user_id) DO NOTHING;

INSERT INTO tenant_membership_role (membership_id, role_id)
SELECT tm.id, ur.role_id
FROM user_role ur
JOIN tenant_membership tm ON tm.user_id = ur.user_id AND tm.tenant_id = 1
ON CONFLICT DO NOTHING;

-- 重置序列
ALTER SEQUENCE tenant_id_seq RESTART WITH 100;
ALTER SEQUENCE tenant_membership_id_seq RESTART WITH 100;
ALTER SEQUENCE tenant_invitation_id_seq RESTART WITH 100;
ALTER SEQUENCE tenant_placement_id_seq RESTART WITH 100;
