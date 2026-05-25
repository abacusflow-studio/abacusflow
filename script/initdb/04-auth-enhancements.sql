-- Auth0 integration enhancements
-- Add new columns to user_external_identity
ALTER TABLE user_external_identity
    ADD COLUMN provider VARCHAR(32),
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN picture_url VARCHAR(1024),
    ADD COLUMN last_login_at TIMESTAMP(6) WITH TIME ZONE,
    ADD COLUMN profile_synced_at TIMESTAMP(6) WITH TIME ZONE;

-- Seed default roles
INSERT INTO role (name, label, created_at, updated_at)
VALUES ('viewer', '查看者', now(), now())
ON CONFLICT (name) DO NOTHING;

-- Seed default permissions
INSERT INTO permission (name, label, description)
VALUES
    ('product:read', '查看产品', '允许查看产品列表和详情'),
    ('product:create', '创建产品', '允许创建新产品'),
    ('product:update', '更新产品', '允许更新产品信息'),
    ('product:delete', '删除产品', '允许删除产品'),
    ('purchase-order:read', '查看采购单', '允许查看采购单列表和详情'),
    ('purchase-order:create', '创建采购单', '允许创建新采购单'),
    ('purchase-order:approve', '审批采购单', '允许审批采购单'),
    ('sale-order:read', '查看销售单', '允许查看销售单列表和详情'),
    ('sale-order:create', '创建销售单', '允许创建新销售单'),
    ('inventory:read', '查看库存', '允许查看库存信息'),
    ('inventory:update', '更新库存', '允许调整库存'),
    ('user:read', '查看用户', '允许查看用户列表和详情'),
    ('user:manage', '管理用户', '允许管理用户角色和状态'),
    ('role:manage', '管理角色', '允许管理角色和权限')
ON CONFLICT DO NOTHING;
