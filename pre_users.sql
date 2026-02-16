-- 创建 pre_users 表（预注册用户/邀请码）
-- 在 Supabase SQL Editor 中执行

-- 1. 创建 pre_users 表（如果已存在则添加字段）
CREATE TABLE IF NOT EXISTS public.pre_users (
  id UUID PRIMARY KEY,
  nickname TEXT NOT NULL UNIQUE,
  encrypted_string TEXT,           -- 加密后的邀请链接
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 2. 如果表已存在，添加 encrypted_string 字段
ALTER TABLE public.pre_users ADD COLUMN IF NOT EXISTS encrypted_string TEXT;

-- 3. 插入示例数据
INSERT INTO public.pre_users (id, nickname, encrypted_string, notes) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', '测试用户', 'JhsRSisHHhEoGw9VNxc/Xg==', '测试邀请码'),
  ('660e8400-e29b-41d4-a716-446655440000', '内侧玩家01', 'Xi8GSysHXi4/Tg9XNxc/Xg==', '内侧邀请'),
  ('770e8400-e29b-41d4-a716-446655440000', '内侧玩家02', 'YC8GSy4HTg8/Xg9XNxc/Xg==', '内侧邀请')
ON CONFLICT (id) DO UPDATE SET
  encrypted_string = EXCLUDED.encrypted_string,
  notes = EXCLUDED.notes;

-- 4. 生成邀请链接函数（在 Supabase Edge Function 或后端使用）
-- 完整 URL: https://你的域名?t=加密字符串

-- 5. 查看所有预注册用户
SELECT id, nickname, encrypted_string, is_used, created_at FROM public.pre_users ORDER BY created_at DESC;

-- 6. 新增或更新实物密钥（URL 参数 t 的值，需与表中 encrypted_string 一致才能通过验证）
-- 示例：实物密钥为 ZKpZJWALR7E2yCeVRBY6 时，执行下面任选一种：
-- 方式 A：插入新预注册用户
-- INSERT INTO public.pre_users (id, nickname, encrypted_string, notes) VALUES
--   (gen_random_uuid(), '新用户', 'ZKpZJWALR7E2yCeVRBY6', '实物密钥');
-- 方式 B：把已有某条的 encrypted_string 改为该密钥
-- UPDATE public.pre_users SET encrypted_string = 'ZKpZJWALR7E2yCeVRBY6' WHERE id = '已有记录的UUID';

-- 7. 若前端提示「无效的邀请码」：请确认 (1) 已执行上述 INSERT/UPDATE，使 encrypted_string = 你的密钥；
--    (2) 表 pre_users 的 RLS 允许匿名用户 SELECT（例如：CREATE POLICY "允许匿名按 encrypted_string 查询"
--    ON public.pre_users FOR SELECT USING (true);）

-- 8. 若 is_used = TRUE 但自动登录失败（提示 used_by 未填写或未找到关联账号）：
--    需要把「该密钥对应的用户」的 id 填进 used_by。该 id 来自 profiles 表（= Supabase Auth 的 user id）。
--    示例：已知昵称为「测试用户」的 profile id 为 xxx，且 pre_users 中该密钥的 id 为 yyy，则：
--    UPDATE public.pre_users SET used_by = 'xxx的UUID' WHERE id = 'yyy的UUID';
--    查 profile id：SELECT id, nickname FROM public.profiles WHERE nickname = '测试用户';

-- 9. 仅凭密钥 t 即可登录（无需密码）：需部署 Edge Function sync-key-password。
--    部署后，第二次及以后用同一密钥打开链接会先由服务端同步对应用户的 Auth 密码为派生密码，再自动登录。
--    部署：supabase functions deploy sync-key-password

-- 10. 删除表（如需重建）
-- DROP TABLE IF EXISTS public.pre_users;
