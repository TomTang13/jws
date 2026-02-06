-- 创建 pre_users 表（预注册用户/邀请码）
-- 在 Supabase SQL Editor 中执行

-- 1. 创建 pre_users 表（如果已存在则添加字段）
CREATE TABLE IF NOT EXISTS public.pre_users (
  id UUID PRIMARY KEY,
  nickname TEXT NOT NULL UNIQUE,
  encrypted_url TEXT,           -- 加密后的邀请链接
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- 2. 如果表已存在，添加 encrypted_url 字段
ALTER TABLE public.pre_users ADD COLUMN IF NOT EXISTS encrypted_url TEXT;

-- 3. 插入示例数据
INSERT INTO public.pre_users (id, nickname, encrypted_url, notes) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', '测试用户', 'JhsRSisHHhEoGw9VNxc/Xg==', '测试邀请码'),
  ('660e8400-e29b-41d4-a716-446655440000', '内侧玩家01', 'Xi8GSysHXi4/Tg9XNxc/Xg==', '内侧邀请'),
  ('770e8400-e29b-41d4-a716-446655440000', '内侧玩家02', 'YC8GSy4HTg8/Xg9XNxc/Xg==', '内侧邀请')
ON CONFLICT (id) DO UPDATE SET
  encrypted_url = EXCLUDED.encrypted_url,
  notes = EXCLUDED.notes;

-- 4. 生成邀请链接函数（在 Supabase Edge Function 或后端使用）
-- 完整 URL: https://你的域名?t=加密字符串

-- 5. 查看所有预注册用户
SELECT id, nickname, encrypted_url, is_used, created_at FROM public.pre_users ORDER BY created_at DESC;

-- 6. 更新单个用户的邀请链接
-- UPDATE public.pre_users SET encrypted_url = '加密字符串' WHERE id = 'UUID';

-- 7. 删除表（如果需要重建）
-- DROP TABLE IF EXISTS public.pre_users;
