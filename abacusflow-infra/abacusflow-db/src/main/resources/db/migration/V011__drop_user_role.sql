-- ============================================================
-- V011__drop_user_role.sql  删除旧 user_role 表
-- ============================================================

-- 所有角色关系现在通过 tenant_membership_role 管理
-- user_role 表不再使用

DROP TABLE IF EXISTS user_role;
