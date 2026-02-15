import { supabase } from './supabase';
import { LevelConfig, Quest, ShopItem, Realm } from './types';

export interface DatabaseLevel {
  level: number;
  title: string;
  title_en: string;
  required_inspiration: number;
  description?: string;
  exam?: string;
}

export interface DatabaseQuest {
  id: string;
  category: 'daily' | 'bounty' | 'milestone';
  title: string;
  description: string;
  min_level: number;
  reward_inspiration: number;
  reward_coins: number;
  cost_coins?: number;
  needs_verification: boolean;
  is_active: boolean;
}

export interface DatabaseShopItem {
  id: string;
  title: string;
  description: string;
  cost_coins: number;
  stock: number;
  is_active: boolean;
}

// 获取等级配置
export async function getLevels(): Promise<LevelConfig[]> {
  const { data, error } = await supabase
    .from('levels')
    .select('*')
    .order('level', { ascending: true });
  
  if (error || !data) {
    console.error('获取等级失败:', error);
    return [];
  }
  
  return data.map((l: DatabaseLevel) => ({
    lv: l.level,
    title: l.title,
    englishTitle: l.title_en,
    inspirationRequired: l.required_inspiration,
    exam: l.exam || '',
    cost: '',
    perks: [],
    realm: l.level <= 3 ? Realm.SPROUT : l.level <= 6 ? Realm.BLOOM : Realm.HARVEST,
    status: '',
    hook: ''
  }));
}

// 获取任务模板
export async function getQuests(type: 'daily' | 'labor' | 'patron'): Promise<Quest[]> {
  const categoryMap: Record<string, string> = {
    'daily': 'daily',
    'labor': 'bounty',
    'patron': 'milestone'
  };
  
  const { data, error } = await supabase
    .from('quest_templates')
    .select('*')
    .eq('category', categoryMap[type])
    .eq('is_active', true)
    .order('min_level', { ascending: true });
  
  if (error || !data) {
    console.error('获取任务失败:', error);
    return [];
  }
  
  const typeMap: Record<string, 'daily' | 'labor' | 'patron'> = {
    'daily': 'daily',
    'bounty': 'labor',
    'milestone': 'patron'
  };
  
  return data.map((q: DatabaseQuest) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    targetLv: q.min_level,
    rewardText: `${q.reward_coins} 灵石 + ${q.reward_inspiration} 灵感`,
    ycReward: q.reward_coins,
    insReward: q.reward_inspiration,
    cost: q.cost_coins,
    type: typeMap[q.category] || 'daily',
    categoryName: type === 'daily' ? '今日心情' : type === 'labor' ? '工坊清单' : '限定通告',
    purpose: ''
  }));
}

// 获取商店物品
export async function getShopItems(): Promise<ShopItem[]> {
  const { data, error } = await supabase
    .from('shop_items')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  
  if (error || !data) {
    console.error('获取商店失败:', error);
    return [];
  }
  
  return data.map((item: DatabaseShopItem, index: number) => ({
    id: item.id,
    name: item.title,
    description: item.description,
    cost: item.cost_coins,
    icon: ['🩹', '🎰', '🧋', '📜'][index % 4]
  }));
}

// 获取用户已完成任务
export async function getUserCompletedQuests(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_quests')
    .select('quest_template_id')
    .eq('user_id', userId)
    .eq('status', 'completed');
  
  return data?.map(q => q.quest_template_id) || [];
}

// 获取用户背包
export async function getUserInventory(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('redemption_logs')
    .select('shop_item_id')
    .eq('user_id', userId)
    .eq('status', 'completed');
  
  return data?.map(r => r.shop_item_id) || [];
}

// 获取用户数据
export async function getUserData(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return profile;
}

// 更新用户进度
export async function updateUserProgress(
  userId: string, 
  updates: Partial<{ coins: number; yc: number; inspiration: number; level: number }>
) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  
  return { error };
}

// 添加任务完成记录
export async function addQuestRecord(
  userId: string, 
  questId: string
) {
  const { error } = await supabase
    .from('user_quests')
    .insert({
      user_id: userId,
      quest_template_id: questId,
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  
  return { error };
}

// 添加兑换记录
export async function addRedemptionRecord(
  userId: string,
  shopItemId: string,
  cost: number
) {
  const { error } = await supabase
    .from('redemption_logs')
    .insert({
      user_id: userId,
      shop_item_id: shopItemId,
      cost_coins: cost,
      status: 'completed'
    });
  
  return { error };
}
