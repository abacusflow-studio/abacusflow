-- Database role bootstrap
-- =======================
-- PostgreSQL users are LOGIN roles. Their passwords are deployment secrets and
-- must never be committed to Flyway migrations. For Supabase, run the following
-- once before Flyway executes this migration, replacing both password
-- placeholders with independent strong random secrets:
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
-- This migration then creates the NOLOGIN permission roles and establishes:
--
-- abacusflow_api (LOGIN)
--   -> abacusflow_runtime (backend read/write privileges, constrained by RLS)
--
-- abacusflow_cube (LOGIN)
--   -> abacusflow_cube_reader (analytics SELECT-only privileges, constrained by RLS)
--
-- In executable form, the memberships established below are equivalent to:
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

-- Permission roles never log in and can never bypass tenant RLS.
ALTER ROLE abacusflow_runtime
    NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

ALTER ROLE abacusflow_cube_reader
    NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

-- The backend API can read and write business data. RLS still restricts every
-- tenant-scoped table by the app.tenant_id connection setting.
GRANT USAGE ON SCHEMA public TO abacusflow_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO abacusflow_runtime;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO abacusflow_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO abacusflow_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO abacusflow_runtime;

-- Cube can only read the tables exposed by the analytics schema.
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
