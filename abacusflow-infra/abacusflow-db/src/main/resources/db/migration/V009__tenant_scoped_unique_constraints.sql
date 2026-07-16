-- ============================================================
-- V009__tenant_scoped_unique_constraints.sql  租户级唯一约束
-- ============================================================

-- 删除旧的全局唯一约束
ALTER TABLE product DROP CONSTRAINT uq_product_barcode;
ALTER TABLE inventory DROP CONSTRAINT uq_inventory_product_id;
ALTER TABLE inventory_unit DROP CONSTRAINT uq_inventory_unit_serial_number;
ALTER TABLE role DROP CONSTRAINT uq_role_name;

-- 添加租户级唯一约束
ALTER TABLE product ADD CONSTRAINT uq_product_tenant_barcode UNIQUE (tenant_id, barcode);
ALTER TABLE inventory ADD CONSTRAINT uq_inventory_tenant_product UNIQUE (tenant_id, product_id);
ALTER TABLE inventory_unit ADD CONSTRAINT uq_inventory_unit_tenant_serial UNIQUE (tenant_id, serial_number);
ALTER TABLE role ADD CONSTRAINT uq_role_tenant_name UNIQUE (tenant_id, name);

-- 添加复合索引
CREATE INDEX idx_product_tenant_category ON product (tenant_id, category_id);
CREATE INDEX idx_sale_order_tenant_status_date ON sale_order (tenant_id, status, order_date DESC);
CREATE INDEX idx_purchase_order_tenant_status_date ON purchase_order (tenant_id, status, order_date DESC);
CREATE INDEX idx_inventory_unit_tenant_inventory ON inventory_unit (tenant_id, inventory_id);
CREATE INDEX idx_feedback_tenant_status_created ON feedback (tenant_id, status, created_at DESC);
CREATE INDEX idx_customer_tenant_name ON customer (tenant_id, name);
CREATE INDEX idx_supplier_tenant_name ON supplier (tenant_id, name);
CREATE INDEX idx_depot_tenant_name ON depot (tenant_id, name);
CREATE INDEX idx_product_category_tenant_name ON product_category (tenant_id, name);
