
import { LevelConfig, Realm, Quest, SkillPath, ShopItem } from './types';

export const LEVELS: LevelConfig[] = [
  // 萌芽期
  { lv: 1, title: '钩针初心者', englishTitle: 'First Stitch Explorer', inspirationRequired: 100, realm: Realm.SPROUT, exam: '【第一份礼物】现场完成一个发夹/书签。', cost: '¥168', perks: ['获得实体手记', 'Lv.1 勋章'], status: '纯消费者', hook: '体验成就感' },
  { lv: 2, title: '见习编织者', englishTitle: 'Needle Rookie', inspirationRequired: 600, realm: Realm.SPROUT, exam: '【平面的秩序】提交一个针脚整齐的方片。', cost: '¥598 月卡', perks: ['心愿墙D级开启', '专属收纳袋'], status: '建立习惯', hook: '建立秩序' },
  { lv: 3, title: '针法学徒', englishTitle: 'Stitch Apprentice', inspirationRequired: 2000, realm: Realm.SPROUT, exam: '【立体初体验】独立完成一个简单立体玩偶。', cost: '¥300+ 进阶包', perks: ['兑换线材特权', '入驻展示柜'], status: '技术积累', hook: '加减针技巧' },
  // 花期
  { lv: 4, title: '平面构筑师', englishTitle: 'Flatwork Builder', inspirationRequired: 5000, realm: Realm.BLOOM, exam: '【色彩的拼图】完成一件祖母方格拼接作品。', cost: '¥999 季卡', perks: ['带新特权', '新品测试员'], status: '宣传大使', hook: '社交共鸣' },
  { lv: 5, title: '立体造型师', englishTitle: '3D Stitch Stylist', inspirationRequired: 12000, realm: Realm.BLOOM, exam: '【赋予灵魂】完成一只复杂的组合式玩偶。', cost: '¥800+ 耗材', perks: ['专属存包柜', '助教身份点亮'], status: '超级用户', hook: '精密组装' },
  { lv: 6, title: '造型艺术家', englishTitle: 'Amigurumi Sculptor', inspirationRequired: 25000, realm: Realm.BLOOM, exam: '【独家复刻】看图解钩出一款从未公开发售的新品。', cost: '¥2000 充值', perks: ['新品优先权', '主理人私享会'], status: '研发共创', hook: '艺术表达' },
  // 果实期
  { lv: 7, title: '织物工程师', englishTitle: 'Fabric Engineer', inspirationRequired: 50000, realm: Realm.HARVEST, exam: '【功能之美】制作一件结构复杂且实用的作品（如内衬包）。', cost: '0 (技术免除)', perks: ['高定接单资格', '终身免会员费'], status: '核心生产力', hook: '开始盈利' },
  { lv: 8, title: '时尚设计师', englishTitle: 'Crochet Stylist', inspirationRequired: 80000, realm: Realm.HARVEST, exam: '【身着的艺术】完成一件合身的成衣。', cost: '0', perks: ['原创图解上架', '个人IP扶持'], status: '创意核心', hook: '品牌分成' },
  { lv: 9, title: '纹理大师', englishTitle: 'Texture Master', inspirationRequired: 120000, realm: Realm.HARVEST, exam: '【肌理的极致】创作一件艺术展级别的作品。', cost: '0', perks: ['店铺分红权', '区域店长候选'], status: '管理合伙人', hook: '巅峰造极' },
  { lv: 10, title: '钩针宗师', englishTitle: 'Grandmaster', inspirationRequired: 999999, realm: Realm.HARVEST, exam: '【宗师之路】培养出 3 名 Lv.7 以上的徒弟。', cost: '0', perks: ['长老会席位', '永久冠名权'], status: '荣誉殿堂', hook: '开宗立派' }
];

export const QUESTS: Quest[] = [
  // 今日心情 (Daily)
  { id: 'd1', type: 'daily', categoryName: '今日心情', targetLv: 1, title: '晨钟签到', description: '今天天气真好，来前台签个到，留下你的手印吧~', ycReward: 10, insReward: 5, rewardText: '10 织梦币', purpose: '打卡习惯' },
  { id: 'd2', type: 'daily', categoryName: '今日心情', targetLv: 1, title: '织梦分享', description: '把桌面的线头清理干净，拍下美照分享心情。', ycReward: 30, insReward: 20, rewardText: '30 织梦币', purpose: '环境与社交' },

  // 工坊清单 (Artisan/Labor)
  { id: 'l1', type: 'labor', categoryName: '工坊清单', targetLv: 1, title: '学徒绕线', description: '帮工坊绕线 1 小时。工坊的繁荣离不开你的勤勉。', ycReward: 50, insReward: 100, rewardText: '100 灵感', purpose: '工匠流' },
  { id: 'l2', type: 'labor', categoryName: '工坊清单', targetLv: 2, title: '草莓叶愿望', description: '制作 10 片绿色的草莓叶子。工坊需要它们装点作品。', ycReward: 100, insReward: 300, rewardText: '300 灵感 + 100 织梦币', purpose: '半成品储备' },
  { id: 'l3', type: 'labor', categoryName: '工坊清单', targetLv: 3, title: '素体养成', description: '制作 20 个玩偶头部（白球）。这是店里最缺的基础。', ycReward: 300, insReward: 800, rewardText: '800 灵感 + 300 织梦币', purpose: '核心组件' },

  // 限定通告 (Collector/Patron)
  { id: 'p1', type: 'patron', categoryName: '限定通告', targetLv: 1, title: '初遇礼包', description: '购买精选新手材料礼包，瞬间点亮创意。', ycReward: 0, insReward: 100, cost: 168, rewardText: '100 灵感', purpose: '收藏家' },
  { id: 'p2', type: 'patron', categoryName: '限定通告', targetLv: 4, title: '闺蜜下午茶', description: '邀请一位新朋友完成体验课，共享织梦时光。', ycReward: 500, insReward: 1000, rewardText: '1000 灵感 + 500 织梦币', purpose: '社交裂变' }
];

export const SKILL_PATHS: SkillPath[] = [
  { id: 'beast', name: '御兽师', focus: '玩偶与生命', perk: '填充棉免费', icon: '🐾' },
  { id: 'armor', name: '织造甲士', focus: '服饰与铠甲', perk: '绕线机免费', icon: '🛡️' },
  { id: 'botanist', name: '花艺师', focus: '花卉与微钩', perk: '铁丝配件免费', icon: '🌸' }
];

export const GUILD_SHOP: ShopItem[] = [
  { id: 's1', name: '治愈币', description: '哎呀小熊受伤了？请师傅修补一次。', cost: 100, icon: '🧶' },
  { id: 's2', name: '扭蛋代币', description: '随机获得精致记号扣或贴纸。', cost: 300, icon: '🧿' },
  { id: 's3', name: '全糖奶茶券', description: '辛苦了！兑换一杯店长特调奶茶。', cost: 2000, icon: '🏅' },
  { id: 's4', name: '禁忌图解', description: '兑换一份非公开的极高难度网红卷。', cost: 1000, icon: '📜' }
];
