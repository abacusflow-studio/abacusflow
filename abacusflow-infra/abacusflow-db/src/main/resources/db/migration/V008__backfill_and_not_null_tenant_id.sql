-- ============================================================
-- V008__backfill_and_not_null_tenant_id.sql  回填 tenant_id 并设为 NOT NULL
-- ============================================================

-- 回填：将所有现有数据分配给默认租户（id=1）
UPDATE role SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE product_category SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE product SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE inventory SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE inventory_unit SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE purchase_order SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE purchase_order_item SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE sale_order SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE sale_order_item SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE customer SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE supplier SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE depot SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE feedback SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 设为 NOT NULL
ALTER TABLE role ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE product_category ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE product ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE inventory ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE inventory_unit ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE purchase_order ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE purchase_order_item ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE sale_order ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE sale_order_item ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE customer ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE supplier ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE depot ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE feedback ALTER COLUMN tenant_id SET NOT NULL;
