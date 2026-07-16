-- ============================================================
-- V007__add_tenant_id_to_business_tables.sql  为所有业务表添加 tenant_id 列
-- ============================================================

-- 添加 nullable tenant_id 列到所有业务表
ALTER TABLE role ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE product_category ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE product ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE inventory ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE inventory_unit ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE purchase_order ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE purchase_order_item ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE sale_order ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE sale_order_item ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE customer ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE supplier ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE depot ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);
ALTER TABLE feedback ADD COLUMN tenant_id BIGINT REFERENCES tenant(id);

-- 创建索引（tenant_id 开头，用于复合查询）
CREATE INDEX idx_role_tenant ON role (tenant_id);
CREATE INDEX idx_product_category_tenant ON product_category (tenant_id);
CREATE INDEX idx_product_tenant ON product (tenant_id);
CREATE INDEX idx_inventory_tenant ON inventory (tenant_id);
CREATE INDEX idx_inventory_unit_tenant ON inventory_unit (tenant_id);
CREATE INDEX idx_purchase_order_tenant ON purchase_order (tenant_id);
CREATE INDEX idx_purchase_order_item_tenant ON purchase_order_item (tenant_id);
CREATE INDEX idx_sale_order_tenant ON sale_order (tenant_id);
CREATE INDEX idx_sale_order_item_tenant ON sale_order_item (tenant_id);
CREATE INDEX idx_customer_tenant ON customer (tenant_id);
CREATE INDEX idx_supplier_tenant ON supplier (tenant_id);
CREATE INDEX idx_depot_tenant ON depot (tenant_id);
CREATE INDEX idx_feedback_tenant ON feedback (tenant_id);
