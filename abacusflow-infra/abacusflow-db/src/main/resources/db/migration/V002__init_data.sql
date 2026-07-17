-- ============================================================
-- V002__init_data.sql  初始化数据（角色、权限、用户、默认租户）
-- ============================================================

-- ✅ 默认租户
INSERT INTO tenant (id, name, display_name, status)
VALUES (1, 'default', '默认租户', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tenant_placement (tenant_id, cell_id, storage_mode)
VALUES (1, 'cell-default-01', 'SHARED_CELL')
ON CONFLICT DO NOTHING;

-- ✅ 默认角色
INSERT INTO role (name, label, tenant_id, created_at, updated_at)
VALUES ('admin', '超级管理员', 1, '2025-06-12 15:35:07.223000 +00:00', '2025-06-12 15:35:16.941000 +00:00')
ON CONFLICT (tenant_id, name) DO NOTHING;
INSERT INTO role (name, label, tenant_id, created_at, updated_at)
VALUES ('reader', '只读用户', 1, NOW(), NOW())
ON CONFLICT (tenant_id, name) DO NOTHING;
INSERT INTO role (name, label, tenant_id, created_at, updated_at)
VALUES ('operator', '操作员', 1, NOW(), NOW())
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ✅ 默认权限
INSERT INTO permission (name, label, description)
VALUES
    -- 平台级权限
    ('platform:tenant:list',       '查看租户列表', '平台管理员查看所有租户'),
    ('platform:tenant:create',     '创建租户',     '平台管理员创建租户'),
    ('platform:tenant:update',     '更新租户',     '平台管理员更新租户信息'),
    ('platform:tenant:delete',     '删除租户',     '平台管理员删除租户'),
    ('platform:user:read',         '查看平台用户', '查看用户列表和详情'),
    ('platform:user:manage',       '管理平台用户', '管理用户角色和状态'),
    ('platform:permission:read',   '查看权限定义', '查看权限列表'),
    ('platform:permission:manage', '管理权限定义', '管理权限 CRUD'),
    -- 租户级权限
    ('tenant:info:read',       '查看租户信息', '查看当前租户详情'),
    ('tenant:member:read',     '查看租户成员', '查看成员列表'),
    ('tenant:member:create',   '添加租户成员', '邀请新成员'),
    ('tenant:member:update',   '更新成员角色', '修改成员角色分配'),
    ('tenant:member:remove',   '移除租户成员', '移除成员'),
    ('tenant:role:read',       '查看租户角色', '查看角色列表'),
    ('tenant:role:manage',     '管理租户角色', '角色增删改'),
    -- 业务权限
    ('product:read', '查看产品', '允许查看产品列表和详情'),
    ('product:create', '创建产品', '允许创建新产品'),
    ('product:update', '更新产品', '允许更新产品信息'),
    ('product:delete', '删除产品', '允许删除产品'),
    ('product-category:read', '查看产品分类', '允许查看产品分类列表和详情'),
    ('product-category:create', '创建产品分类', '允许创建新产品分类'),
    ('product-category:update', '更新产品分类', '允许更新产品分类信息'),
    ('product-category:delete', '删除产品分类', '允许删除产品分类'),
    ('purchase-order:read', '查看采购单', '允许查看采购单列表和详情'),
    ('purchase-order:create', '创建采购单', '允许创建新采购单'),
    ('purchase-order:approve', '审批采购单', '允许审批采购单'),
    ('sale-order:read', '查看销售单', '允许查看销售单列表和详情'),
    ('sale-order:create', '创建销售单', '允许创建新销售单'),
    ('sale-order:approve', '审批销售单', '允许审批销售单'),
    ('inventory:read', '查看库存', '允许查看库存信息'),
    ('inventory:update', '更新库存', '允许调整库存'),
    ('inventory-unit:read', '查看库存单元', '允许查看库存单元列表和详情'),
    ('inventory-unit:update', '更新库存单元', '允许更新库存单元信息'),
    ('depot:read', '查看仓库', '允许查看仓库列表和详情'),
    ('depot:create', '创建仓库', '允许创建新仓库'),
    ('depot:update', '更新仓库', '允许更新仓库信息'),
    ('depot:delete', '删除仓库', '允许删除仓库'),
    ('customer:read', '查看客户', '允许查看客户列表和详情'),
    ('customer:create', '创建客户', '允许创建新客户'),
    ('customer:update', '更新客户', '允许更新客户信息'),
    ('customer:delete', '删除客户', '允许删除客户'),
    ('supplier:read', '查看供应商', '允许查看供应商列表和详情'),
    ('supplier:create', '创建供应商', '允许创建新供应商'),
    ('supplier:update', '更新供应商', '允许更新供应商信息'),
    ('supplier:delete', '删除供应商', '允许删除供应商'),
    ('feedback:create', '提交反馈', '允许提交问题反馈'),
    ('feedback:read', '查看反馈', '允许查看反馈列表和详情'),
    ('feedback:update', '更新反馈', '允许更新反馈状态和负责人')
ON CONFLICT DO NOTHING;

-- ✅ 角色权限绑定
-- admin 角色绑定所有权限（platform:* + tenant:* + 业务权限）
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'admin' AND r.tenant_id = 1
ON CONFLICT DO NOTHING;

-- reader 角色：只绑定 tenant:* 的 :read 权限 + 业务 :read 权限（不含任何 platform:* 权限）
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'reader' AND r.tenant_id = 1
  AND (
    (p.name LIKE 'tenant:%' AND p.name LIKE '%:read')
    OR (p.name NOT LIKE 'platform:%' AND p.name NOT LIKE 'tenant:%' AND p.name LIKE '%:read')
  )
ON CONFLICT DO NOTHING;

-- operator 角色：绑定 tenant:info:read + tenant:member:* + tenant:role:read + 业务权限（不含 platform:* 权限）
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'operator' AND r.tenant_id = 1
  AND (
    p.name IN ('tenant:info:read', 'tenant:member:read', 'tenant:member:create', 'tenant:member:update', 'tenant:member:remove', 'tenant:role:read')
    OR (p.name NOT LIKE 'platform:%' AND p.name NOT LIKE 'tenant:%')
  )
ON CONFLICT DO NOTHING;

-- ✅ 管理员账号
INSERT INTO user_account (age, created_at, enabled, locked, name, nick, password, sex, updated_at)
VALUES (18, '2025-06-12 15:33:17.384000 +00:00', TRUE, FALSE, 'admin', '超级管理员',
        '$2a$10$w6HLBTQcJhIFQcS6kOtgaOrJG3gm8GgmIGMfp3wiMwGW6OCA1Jd1S', 'M',
        '2025-06-12 15:34:18.513000 +00:00')
ON CONFLICT (name) DO NOTHING;

-- ✅ 管理员租户成员与角色绑定
INSERT INTO tenant_membership (tenant_id, user_id, status)
SELECT 1, ua.id, 'ACTIVE'
FROM user_account ua
WHERE ua.name = 'admin'
ON CONFLICT (tenant_id, user_id) DO NOTHING;

INSERT INTO tenant_membership_role (membership_id, role_id)
SELECT tm.id, r.id
FROM tenant_membership tm
JOIN user_account ua ON ua.id = tm.user_id AND ua.name = 'admin'
JOIN role r ON r.name = 'admin' AND r.tenant_id = 1
WHERE tm.tenant_id = 1
ON CONFLICT DO NOTHING;

-- ✅ 产品分类根节点
INSERT INTO product_category (id, created_at, description, name, updated_at, parent_id, tenant_id)
VALUES (1, '2025-06-15 22:06:19.472000 +00:00', NULL, '根节点', '2025-06-15 22:06:19.472000 +00:00', NULL, 1)
ON CONFLICT (id) DO NOTHING;

-- ✅ 序列重置
ALTER SEQUENCE user_account_id_seq RESTART WITH 100;
ALTER SEQUENCE role_id_seq RESTART WITH 100;
ALTER SEQUENCE permission_id_seq RESTART WITH 100;
ALTER SEQUENCE product_category_id_seq RESTART WITH 100;
ALTER SEQUENCE tenant_id_seq RESTART WITH 100;
ALTER SEQUENCE tenant_membership_id_seq RESTART WITH 100;
ALTER SEQUENCE tenant_invitation_id_seq RESTART WITH 100;
ALTER SEQUENCE tenant_placement_id_seq RESTART WITH 100;
