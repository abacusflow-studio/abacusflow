-- ============================================================
-- V002__init_data.sql  最终初始化数据（权限、角色、用户、默认租户）
-- ============================================================

-- ✅ 默认租户
INSERT INTO tenant (id, name, display_name, status)
VALUES (1, 'default', '默认租户', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tenant_placement (tenant_id, cell_id, storage_mode)
VALUES (1, 'cell-default-01', 'SHARED_CELL')
ON CONFLICT DO NOTHING;

-- ✅ 规范权限目录：10 PLATFORM + 8 TENANT + 33 BUSINESS
INSERT INTO permission (name, label, description, scope)
VALUES
    ('platform:tenant:list',       '查看租户列表', '平台管理员查看所有租户', 'PLATFORM'),
    ('platform:tenant:create',     '创建租户',     '平台管理员创建租户', 'PLATFORM'),
    ('platform:tenant:update',     '更新租户',     '平台管理员更新租户信息', 'PLATFORM'),
    ('platform:tenant:delete',     '删除租户',     '平台管理员删除租户', 'PLATFORM'),
    ('platform:user:read',         '查看平台用户', '查看用户列表和详情', 'PLATFORM'),
    ('platform:user:manage',       '管理平台用户', '管理用户角色和状态', 'PLATFORM'),
    ('platform:permission:read',   '查看权限定义', '查看权限目录', 'PLATFORM'),
    ('platform:permission:manage', '管理权限元数据', '编辑权限显示名称和描述', 'PLATFORM'),
    ('platform:role:read',         '查看平台角色', '查看全局平台角色和分配', 'PLATFORM'),
    ('platform:role:manage',       '管理平台角色', '管理全局平台角色和用户分配', 'PLATFORM'),

    ('tenant:profile:read',   '查看租户信息', '查看当前租户详情', 'TENANT'),
    ('tenant:profile:update', '更新租户信息', '更新当前租户资料', 'TENANT'),
    ('tenant:member:read',    '查看租户成员', '查看成员列表', 'TENANT'),
    ('tenant:member:create',  '添加租户成员', '邀请新成员', 'TENANT'),
    ('tenant:member:update',  '更新成员角色', '修改成员角色分配', 'TENANT'),
    ('tenant:member:remove',  '移除租户成员', '移除成员', 'TENANT'),
    ('tenant:role:read',      '查看租户角色', '查看角色列表', 'TENANT'),
    ('tenant:role:manage',    '管理租户角色', '管理租户角色与权限分配', 'TENANT'),

    ('business:product:read', '查看产品', '允许查看产品列表和详情', 'BUSINESS'),
    ('business:product:create', '创建产品', '允许创建新产品', 'BUSINESS'),
    ('business:product:update', '更新产品', '允许更新产品信息', 'BUSINESS'),
    ('business:product:delete', '删除产品', '允许删除产品', 'BUSINESS'),
    ('business:product-category:read', '查看产品分类', '允许查看产品分类列表和详情', 'BUSINESS'),
    ('business:product-category:create', '创建产品分类', '允许创建新产品分类', 'BUSINESS'),
    ('business:product-category:update', '更新产品分类', '允许更新产品分类信息', 'BUSINESS'),
    ('business:product-category:delete', '删除产品分类', '允许删除产品分类', 'BUSINESS'),
    ('business:purchase-order:read', '查看采购单', '允许查看采购单列表和详情', 'BUSINESS'),
    ('business:purchase-order:create', '创建采购单', '允许创建新采购单', 'BUSINESS'),
    ('business:purchase-order:approve', '审批采购单', '允许审批采购单', 'BUSINESS'),
    ('business:sale-order:read', '查看销售单', '允许查看销售单列表和详情', 'BUSINESS'),
    ('business:sale-order:create', '创建销售单', '允许创建新销售单', 'BUSINESS'),
    ('business:sale-order:approve', '审批销售单', '允许审批销售单', 'BUSINESS'),
    ('business:inventory:read', '查看库存', '允许查看库存信息', 'BUSINESS'),
    ('business:inventory:update', '更新库存', '允许调整库存', 'BUSINESS'),
    ('business:inventory-unit:read', '查看库存单元', '允许查看库存单元列表和详情', 'BUSINESS'),
    ('business:inventory-unit:update', '更新库存单元', '允许更新库存单元信息', 'BUSINESS'),
    ('business:depot:read', '查看仓库', '允许查看仓库列表和详情', 'BUSINESS'),
    ('business:depot:create', '创建仓库', '允许创建新仓库', 'BUSINESS'),
    ('business:depot:update', '更新仓库', '允许更新仓库信息', 'BUSINESS'),
    ('business:depot:delete', '删除仓库', '允许删除仓库', 'BUSINESS'),
    ('business:customer:read', '查看客户', '允许查看客户列表和详情', 'BUSINESS'),
    ('business:customer:create', '创建客户', '允许创建新客户', 'BUSINESS'),
    ('business:customer:update', '更新客户', '允许更新客户信息', 'BUSINESS'),
    ('business:customer:delete', '删除客户', '允许删除客户', 'BUSINESS'),
    ('business:supplier:read', '查看供应商', '允许查看供应商列表和详情', 'BUSINESS'),
    ('business:supplier:create', '创建供应商', '允许创建新供应商', 'BUSINESS'),
    ('business:supplier:update', '更新供应商', '允许更新供应商信息', 'BUSINESS'),
    ('business:supplier:delete', '删除供应商', '允许删除供应商', 'BUSINESS'),
    ('business:feedback:create', '提交反馈', '允许提交问题反馈', 'BUSINESS'),
    ('business:feedback:read', '查看反馈', '允许查看反馈列表和详情', 'BUSINESS'),
    ('business:feedback:update', '更新反馈', '允许更新反馈状态和负责人', 'BUSINESS')
ON CONFLICT (name) DO NOTHING;

-- ✅ 默认租户角色
INSERT INTO role (name, label, tenant_id)
VALUES
    ('admin', '超级管理员', 1),
    ('reader', '只读用户', 1),
    ('operator', '操作员', 1)
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT role.id, permission.id
FROM role
CROSS JOIN permission
WHERE role.name = 'admin'
  AND role.tenant_id = 1
  AND permission.scope IN ('TENANT', 'BUSINESS')
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT role.id, permission.id
FROM role
CROSS JOIN permission
WHERE role.name = 'reader'
  AND role.tenant_id = 1
  AND permission.scope = 'BUSINESS'
  AND permission.name LIKE '%:read'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT role.id, permission.id
FROM role
CROSS JOIN permission
WHERE role.name = 'operator'
  AND role.tenant_id = 1
  AND permission.scope = 'BUSINESS'
ON CONFLICT DO NOTHING;

-- ✅ 平台角色
INSERT INTO platform_role (name, label)
VALUES ('platform-admin', '平台管理员')
ON CONFLICT (name) DO NOTHING;

INSERT INTO platform_role_permission (platform_role_id, permission_id)
SELECT platform_role.id, permission.id
FROM platform_role
CROSS JOIN permission
WHERE platform_role.name = 'platform-admin'
  AND permission.scope = 'PLATFORM'
ON CONFLICT DO NOTHING;

-- ✅ 初始管理员账号，同时拥有平台管理员和默认租户管理员身份
INSERT INTO user_account (age, created_at, enabled, locked, name, nick, password, sex, updated_at)
VALUES (18, '2025-06-12 15:33:17.384000 +00:00', TRUE, FALSE, 'admin', '超级管理员',
        '$2a$10$w6HLBTQcJhIFQcS6kOtgaOrJG3gm8GgmIGMfp3wiMwGW6OCA1Jd1S', 'M',
        '2025-06-12 15:34:18.513000 +00:00')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tenant_membership (tenant_id, user_id, status)
SELECT 1, user_account.id, 'ACTIVE'
FROM user_account
WHERE user_account.name = 'admin'
ON CONFLICT (tenant_id, user_id) DO NOTHING;

INSERT INTO tenant_membership_role (membership_id, role_id)
SELECT membership.id, role.id
FROM tenant_membership membership
JOIN user_account ON user_account.id = membership.user_id AND user_account.name = 'admin'
JOIN role ON role.name = 'admin' AND role.tenant_id = membership.tenant_id
WHERE membership.tenant_id = 1
ON CONFLICT DO NOTHING;

INSERT INTO platform_user_role (user_id, platform_role_id)
SELECT user_account.id, platform_role.id
FROM user_account
CROSS JOIN platform_role
WHERE user_account.name = 'admin'
  AND platform_role.name = 'platform-admin'
ON CONFLICT (user_id, platform_role_id) DO NOTHING;

-- ✅ 所有 identity 序列移到当前最大 ID 之后，并为后续业务数据保留 100 以下 ID。
DO $$
DECLARE
    identity_table RECORD;
BEGIN
    FOR identity_table IN
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'id'
          AND is_identity = 'YES'
    LOOP
        EXECUTE format(
            'SELECT setval(pg_get_serial_sequence(%L, %L), GREATEST(COALESCE(MAX(id), 0) + 1, 100), FALSE) FROM %I',
            identity_table.table_name,
            'id',
            identity_table.table_name
        );
    END LOOP;
END
$$;
