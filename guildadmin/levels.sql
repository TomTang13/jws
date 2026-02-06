-- 同步等级配置到 Supabase
-- 在 Supabase SQL Editor 中执行

INSERT INTO public.levels (level, title, title_en, required_inspiration, description, exam, created_at) VALUES
-- 萌芽期
(1, '钩针初心者', 'First Stitch Explorer', 0, '体验成就感', '【第一份礼物】现场完成一个发夹/书签。', NOW()),
(2, '见习编织者', 'Needle Rookie', 600, '建立秩序', '【平面的秩序】提交一个针脚整齐的方片。', NOW()),
(3, '针法学徒', 'Stitch Apprentice', 2000, '加减针魔法', '【立体初体验】独立完成一个简单立体玩偶。', NOW()),
-- 花期
(4, '平面构筑师', 'Flatwork Builder', 5000, '社交共鸣', '【色彩的拼图】完成一件祖母方格拼接作品。', NOW()),
(5, '立体魔法师', '3D Stitch Magician', 12000, '精密组装', '【赋予灵魂】完成一只复杂的组合式玩偶。', NOW()),
(6, '造型艺术家', 'Amigurumi Sculptor', 25000, '艺术表达', '【独家复刻】看图解钩出一款从未公开发售的新品。', NOW()),
-- 果实期
(7, '织物工程师', 'Fabric Engineer', 50000, '开始盈利', '【功能之美】制作一件结构复杂且实用的作品（如内衬包）。', NOW()),
(8, '时尚设计师', 'Crochet Stylist', 80000, '品牌分成', '【身着的艺术】完成一件合身的成衣。', NOW()),
(9, '纹理大师', 'Texture Master', 120000, '巅峰造极', '【肌理的极致】创作一件艺术展级别的作品。', NOW()),
(10, '钩针宗师', 'Grandmaster', 999999, '开宗立派', '【宗师之路】培养出 3 名 Lv.7 以上的徒弟。', NOW())
ON CONFLICT (level) DO UPDATE SET
  title = EXCLUDED.title,
  title_en = EXCLUDED.title_en,
  required_inspiration = EXCLUDED.required_inspiration,
  description = EXCLUDED.description,
  exam = EXCLUDED.exam;

-- 验证数据
SELECT * FROM public.levels ORDER BY level ASC;
