-- 数据库角色、权限与租户 RLS 初始化
-- ================================
-- PostgreSQL 用户本质上是 LOGIN 角色，其密码属于部署密钥，不能提交到 Flyway。
-- Supabase 需要在执行 Flyway 前手动运行一次以下语句，并替换为两个独立强密码：
--
-- CREATE ROLE abacusflow_api
--     LOGIN
--     PASSWORD '<API_STRONG_RANDOM_PASSWORD>'
--     NOSUPERUSER
--     NOCREATEDB
--     NOCREATEROLE
--     INHERIT
--     NOBYPASSRLS;
--
-- CREATE ROLE abacusflow_cube
--     LOGIN
--     PASSWORD '<CUBE_DATABASE_STRONG_RANDOM_PASSWORD>'
--     NOSUPERUSER
--     NOCREATEDB
--     NOCREATEROLE
--     INHERIT
--     NOBYPASSRLS;
--
-- 本迁移创建不可登录的权限角色、启用租户 RLS，并建立以下继承关系：
--
-- abacusflow_api (LOGIN)
--   -> abacusflow_runtime (backend read/write privileges, constrained by RLS)
--
-- abacusflow_cube (LOGIN)
--   -> abacusflow_cube_reader (analytics SELECT-only privileges, constrained by RLS)
--
-- 对应的角色继承语句为：
--
-- GRANT abacusflow_runtime TO abacusflow_api;
-- GRANT abacusflow_cube_reader TO abacusflow_cube;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'abacusflow_runtime') THEN
        CREATE ROLE abacusflow_runtime
            NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'abacusflow_cube_reader') THEN
        CREATE ROLE abacusflow_cube_reader
            NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
END
$$;

-- 权限角色不可登录，也不能绕过租户 RLS。
ALTER ROLE abacusflow_runtime
    NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

ALTER ROLE abacusflow_cube_reader
    NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

-- ============================================================
-- 租户行级安全：所有业务查询和写入都受 app.tenant_id 限制
-- ============================================================
DO $$
DECLARE
    target_table TEXT;
BEGIN
    FOREACH target_table IN ARRAY ARRAY[
        'product',
        'product_category',
        'inventory',
        'inventory_unit',
        'purchase_order',
        'purchase_order_item',
        'sale_order',
        'sale_order_item',
        'customer',
        'supplier',
        'depot',
        'feedback',
        'tenant_role'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', target_table);
        EXECUTE format(
            'CREATE POLICY %I ON %I ' ||
            'USING (tenant_id = NULLIF(CURRENT_SETTING(''app.tenant_id'', TRUE), '''')::BIGINT) ' ||
            'WITH CHECK (tenant_id = NULLIF(CURRENT_SETTING(''app.tenant_id'', TRUE), '''')::BIGINT)',
            target_table || '_tenant_policy',
            target_table
        );
    END LOOP;
END
$$;

-- ============================================================
-- 后端 API：业务表读写权限，实际可见行仍由 RLS 限制
-- ============================================================
GRANT USAGE ON SCHEMA public TO abacusflow_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO abacusflow_runtime;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO abacusflow_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO abacusflow_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO abacusflow_runtime;

-- ============================================================
-- Cube：仅授予分析模型所需业务表的只读权限
-- ============================================================
GRANT USAGE ON SCHEMA public TO abacusflow_cube_reader;
GRANT SELECT ON TABLE
    customer,
    depot,
    inventory,
    inventory_unit,
    product,
    product_category,
    purchase_order,
    purchase_order_item,
    sale_order,
    sale_order_item,
    supplier
TO abacusflow_cube_reader;

-- ============================================================
-- 登录账号继承权限角色；账号不存在时由部署流程先行创建
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'abacusflow_api') THEN
        ALTER ROLE abacusflow_api
            LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS;
        GRANT abacusflow_runtime TO abacusflow_api;
    END IF;

    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'abacusflow_cube') THEN
        ALTER ROLE abacusflow_cube
            LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS;
        GRANT abacusflow_cube_reader TO abacusflow_cube;
    END IF;
END
$$;
