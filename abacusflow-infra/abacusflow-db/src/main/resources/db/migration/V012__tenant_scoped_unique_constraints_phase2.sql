-- ============================================================
-- V012__tenant_scoped_unique_constraints_phase2.sql  补充租户级唯一约束
-- ============================================================

-- 1. 订单号：从全局唯一改为租户级唯一
--    订单号目前是 UUID，全局碰撞概率极低，但语义上应在租户内唯一
--    未来如果改为可读编号（如 SO-2026-001），租户级唯一就是必须的
ALTER TABLE sale_order DROP CONSTRAINT uq_sale_order_no;
ALTER TABLE sale_order ADD CONSTRAINT uq_sale_order_tenant_no UNIQUE (tenant_id, no);

ALTER TABLE purchase_order DROP CONSTRAINT uq_purchase_order_no;
ALTER TABLE purchase_order ADD CONSTRAINT uq_purchase_order_tenant_no UNIQUE (tenant_id, no);

-- 2. 产品分类：同一租户、同一父分类下名称唯一
--    允许不同父分类下有同名子分类（如"电子产品 > 配件" 和 "办公用品 > 配件"）
--    注意：PostgreSQL 中 NULL 不等于 NULL，所以两个顶级分类（parent_id=NULL）同名不会被此约束拦截
--    顶级分类的唯一性通过下面的部分索引保证
ALTER TABLE product_category ADD CONSTRAINT uq_product_category_tenant_parent_name UNIQUE (tenant_id, parent_id, name);

-- 顶级分类（parent_id IS NULL）在同一租户内名称唯一
-- 标准 UNIQUE 约束对 NULL 值不生效，需要用部分索引（Partial Index）
CREATE UNIQUE INDEX uq_product_category_tenant_root_name ON product_category (tenant_id, name) WHERE parent_id IS NULL;

-- 3. 客户：同一租户内客户名称唯一
ALTER TABLE customer ADD CONSTRAINT uq_customer_tenant_name UNIQUE (tenant_id, name);

-- 4. 供应商：同一租户内供应商名称唯一
ALTER TABLE supplier ADD CONSTRAINT uq_supplier_tenant_name UNIQUE (tenant_id, name);

-- 5. 仓库：同一租户内仓库名称唯一
ALTER TABLE depot ADD CONSTRAINT uq_depot_tenant_name UNIQUE (tenant_id, name);
