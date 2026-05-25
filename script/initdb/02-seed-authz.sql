-- ============================================================
-- 03-seed-authz.sql  授权相关默认数据（角色、权限、角色-权限绑定）
-- ============================================================

-- 默认角色
INSERT INTO role (name, label, created_at, updated_at)
VALUES ('admin', '超级管理员', '2025-06-12 15:35:07.223000 +00:00', '2025-06-12 15:35:16.941000 +00:00')
ON CONFLICT (name) DO NOTHING;
INSERT INTO role (name, label, created_at, updated_at)
VALUES ('reader', '只读用户', now(), now())
ON CONFLICT (name) DO NOTHING;
INSERT INTO role (name, label, created_at, updated_at)
VALUES ('operator', '操作员', now(), now())
ON CONFLICT (name) DO NOTHING;
ALTER SEQUENCE role_id_seq RESTART WITH 100;

-- 默认权限
INSERT INTO permission (name, label, description)
VALUES
    ('user:read', '查看用户', '允许查看用户列表和详情'),
    ('role:read', '查看角色', '允许查看角色和权限'),
    ('user:manage', '管理用户', '允许管理用户角色和状态'),
    ('role:manage', '管理角色', '允许管理角色和权限'),
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
    ('supplier:delete', '删除供应商', '允许删除供应商')
ON CONFLICT DO NOTHING;
ALTER SEQUENCE permission_id_seq RESTART WITH 100;

-- admin 角色绑定所有权限
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- reader 角色绑定只读权限
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'reader'
  AND p.name LIKE '%:read'
ON CONFLICT DO NOTHING;

-- operator 角色绑定业务操作权限（读写+审批，不含管理类）
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id
FROM role r, permission p
WHERE r.name = 'operator'
  AND p.name NOT IN ('user:read', 'role:read', 'user:manage', 'role:manage')
ON CONFLICT DO NOTHING;
