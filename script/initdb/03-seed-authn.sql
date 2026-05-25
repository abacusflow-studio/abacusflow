-- ============================================================
-- 02-seed-authn.sql  认证相关默认数据（用户、角色绑定）
-- ============================================================

-- 管理员账号
INSERT INTO public.user_account (age, created_at, enabled, locked, name, nick, password, sex, updated_at)
VALUES (18, '2025-06-12 15:33:17.384000 +00:00', true, false, 'admin', '超级管理员', '$2a$10$w6HLBTQcJhIFQcS6kOtgaOrJG3gm8GgmIGMfp3wiMwGW6OCA1Jd1S', 'M',
        '2025-06-12 15:34:18.513000 +00:00');
ALTER SEQUENCE user_account_id_seq RESTART WITH 100;

-- 管理员绑定 admin 角色
INSERT INTO public.user_role (user_id, role_id)
SELECT (SELECT id FROM public.user_account WHERE name = 'admin'),
       (SELECT id FROM public.role WHERE name = 'admin');
