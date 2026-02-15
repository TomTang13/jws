-- 在 Supabase 控制台 → SQL Editor 中执行本脚本
-- 作用：确保实物密钥 ZKpZJWALR7E2yCeVRBY6 在 pre_users 表中存在，前端 ?t=ZKpZJWALR7E2yCeVRBY6 即可通过验证

-- 1. 确保表存在
CREATE TABLE IF NOT EXISTS public.pre_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL,
  encrypted_string TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE public.pre_users ADD COLUMN IF NOT EXISTS encrypted_string TEXT;
ALTER TABLE public.pre_users ADD COLUMN IF NOT EXISTS is_used BOOLEAN DEFAULT FALSE;
ALTER TABLE public.pre_users ADD COLUMN IF NOT EXISTS used_by UUID;

-- 2. 写入密钥 ZKpZJWALR7E2yCeVRBY6（先删同密钥再插，保证只有一条）
DELETE FROM public.pre_users WHERE encrypted_string = 'ZKpZJWALR7E2yCeVRBY6';
INSERT INTO public.pre_users (id, nickname, encrypted_string, is_used, notes)
VALUES (gen_random_uuid(), '织梦人', 'ZKpZJWALR7E2yCeVRBY6', FALSE, '实物密钥');
-- 若报错 nickname 已存在，把上面 '织梦人' 改成别的（如 '织梦人01'）再执行

-- 3. 确认有一条 encrypted_string = 你的密钥
SELECT id, nickname, encrypted_string, is_used FROM public.pre_users WHERE encrypted_string = 'ZKpZJWALR7E2yCeVRBY6';

-- 4. 若仍提示无效，多半是 RLS 未开放匿名读，执行下面两句（二选一）：
-- 4a. 允许匿名用户读取 pre_users 任意行
-- ALTER TABLE public.pre_users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "anon_select_pre_users" ON public.pre_users FOR SELECT TO anon USING (true);

-- 4b. 若表未开 RLS，可直接关闭 RLS 便于本地/测试（生产环境建议用 4a）
-- ALTER TABLE public.pre_users DISABLE ROW LEVEL SECURITY;
