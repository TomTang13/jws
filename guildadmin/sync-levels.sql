-- 添加 exam 字段并同步完整的等级数据
-- 在 Supabase SQL Editor 中执行

-- 1. 添加 exam 字段（如果不存在）
ALTER TABLE public.levels ADD COLUMN IF NOT EXISTS exam TEXT;

-- 2. 更新所有等级的 exam 字段
UPDATE public.levels SET
  exam = CASE level
    WHEN 1 THEN '【第一份礼物】现场完成一个发夹/书签。'
    WHEN 2 THEN '【平面的秩序】提交一个针脚整齐的方片。'
    WHEN 3 THEN '【立体初体验】独立完成一个简单立体玩偶。'
    WHEN 4 THEN '【色彩的拼图】完成一件祖母方格拼接作品。'
    WHEN 5 THEN '【赋予灵魂】完成一只复杂的组合式玩偶。'
    WHEN 6 THEN '【独家复刻】看图解钩出一款从未公开发售的新品。'
    WHEN 7 THEN '【功能之美】制作一件结构复杂且实用的作品（如内衬包）。'
    WHEN 8 THEN '【身着的艺术】完成一件合身的成衣。'
    WHEN 9 THEN '【肌理的极致】创作一件艺术展级别的作品。'
    WHEN 10 THEN '【宗师之路】培养出 3 名 Lv.7 以上的徒弟。'
  END
WHERE exam IS NULL;

-- 3. 验证数据
SELECT level, title, required_inspiration, exam FROM public.levels ORDER BY level ASC;
