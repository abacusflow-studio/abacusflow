-- Cube uses a dedicated read-only role. The login role is provisioned from
-- deployment secrets; this group role owns only the analytics read grants.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'abacusflow_cube_reader') THEN
        CREATE ROLE abacusflow_cube_reader
            NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    END IF;
END
$$;

ALTER ROLE abacusflow_cube_reader
    NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;

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
