-- ============================================================
-- 04-seed-product.sql  产品相关默认数据
-- ============================================================

INSERT INTO public.product_category (id, created_at, description, name, updated_at, parent_id)
VALUES (1, '2025-06-15 22:06:19.472000 +00:00', null, '根节点', '2025-06-15 22:06:19.472000 +00:00', null);

ALTER SEQUENCE product_category_id_seq RESTART WITH 100;
