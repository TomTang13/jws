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
    rewardText: `${q.reward_coins} 织梦币 + ${q.reward_inspiration} 灵感`,
    ycReward: q.reward_coins,
    insReward: q.reward_inspiration,
    cost: q.cost_coins,
    type: typeMap[q.category] || 'daily',
    categoryName: type === 'daily' ? '今日心情' : type === 'labor' ? '工坊清单' : '限定通告',
    purpose: '',
    needs_verification: q.needs_verification
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
  try {
    const { data, error } = await supabase
      .from('user_quests')
      .select('quest_template_id')
      .eq('user_id', userId)
      .eq('status', 'completed');
    
    if (error) {
      console.error('获取已完成任务失败:', error);
      return [];
    }
    
    return data?.map(q => q.quest_template_id) || [];
  } catch (error) {
    console.error('获取已完成任务失败:', error);
    return [];
  }
}

// 检查特定任务的状态
export async function checkQuestStatus(userId: string, questId: string): Promise<boolean> {
  try {
    console.log('Checking quest status with:', { userId, questId });
    
    // 检查 user_quests 表中是否有已完成的任务记录
    const { data: userQuestData, error: userQuestError } = await supabase
      .from('user_quests')
      .select('id')
      .eq('user_id', userId)
      .eq('quest_template_id', questId)
      .eq('status', 'completed');
    
    if (userQuestError) {
      console.error('Supabase error checking user_quests:', userQuestError);
      return false;
    }
    
    console.log('Quest status check data (user_quests):', userQuestData);
    return userQuestData && userQuestData.length > 0;
  } catch (error) {
    console.error('Error checking quest status:', error);
    return false;
  }
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
  questId: string,
  qrCodeId: string
) {
  const { error } = await supabase
    .rpc('add_quest_record', {
      p_user_id: userId,
      p_quest_id: questId,
      p_qr_code_id: qrCodeId
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

// 生成任务二维码
export async function generateQuestQRCode(
  questId: string,
  userId: string
): Promise<{ qrCodeUrl: string; qrCodeContent: string; qrCodeId: string }> {
  // 生成唯一的二维码内容
  const qrCodeContent = `jws:quest:${questId}:${userId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  // 使用在线二维码生成服务
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeContent)}`;
  
  // 保存到数据库
  const { data, error } = await supabase
    .from('quest_qr_codes')
    .insert({
      quest_template_id: questId,
      qr_code_content: qrCodeContent,
      qr_code_url: qrCodeUrl,
      user_id: userId,
      status: 'generated'
    })
    .select('id')
    .single();
  
  if (error || !data) {
    console.error('生成二维码失败:', error);
    throw error;
  }
  
  return { qrCodeUrl, qrCodeContent, qrCodeId: data.id };
}

// 验证任务二维码
export async function verifyQuestQRCode(
  qrCodeContent: string
): Promise<{ ok: boolean; error?: string; questId?: string; userId?: string; qrCodeId?: string }> {
  // 解析二维码内容
  const parts = qrCodeContent.split(':');
  if (parts.length < 5 || parts[0] !== 'jws' || parts[1] !== 'quest') {
    return { ok: false, error: '无效的二维码内容' };
  }
  
  const questId = parts[2];
  const userId = parts[3];
  
  // 检查二维码是否存在
  const { data: qrCode, error } = await supabase
    .from('quest_qr_codes')
    .select('*')
    .eq('qr_code_content', qrCodeContent)
    .single();
  
  if (error || !qrCode) {
    return { ok: false, error: '二维码不存在' };
  }
  
  if (qrCode.status === 'verified') {
    return { ok: false, error: '二维码已验证' };
  }
  
  if (qrCode.status === 'expired') {
    return { ok: false, error: '二维码已过期' };
  }
  
  if (qrCode.status === 'cancelled') {
    return { ok: false, error: '二维码已取消' };
  }
  
  // 只返回二维码信息，不更新状态
  return { ok: true, questId, userId, qrCodeId: qrCode.id };
}

// 过期任务二维码
export async function expireQuestQRCode(
  qrCodeId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 更新二维码状态为过期
    await supabase
      .from('quest_qr_codes')
      .update({
        status: 'expired',
        expired_at: new Date().toISOString()
      })
      .eq('id', qrCodeId);
    
    return { ok: true };
  } catch (error) {
    console.error('过期二维码失败:', error);
    return { ok: false, error: '过期二维码失败' };
  }
}

// 取消任务二维码
export async function cancelQuestQRCode(
  qrCodeId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 更新二维码状态为取消
    await supabase
      .from('quest_qr_codes')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', qrCodeId);
    
    return { ok: true };
  } catch (error) {
    console.error('取消二维码失败:', error);
    return { ok: false, error: '取消二维码失败' };
  }
}

// 更新任务二维码状态
export async function updateQuestQRCodeStatus(
  qrCodeId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 更新二维码状态为验证
    await supabase
      .from('quest_qr_codes')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        scanned_at: new Date().toISOString()
      })
      .eq('id', qrCodeId);
    
    return { ok: true };
  } catch (error) {
    console.error('更新二维码状态失败:', error);
    return { ok: false, error: '更新二维码状态失败' };
  }
}

// 检查任务是否已完成
export async function isQuestCompleted(
  userId: string,
  questId: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('user_quests')
      .select('id')
      .eq('user_id', userId)
      .eq('quest_template_id', questId)
      .eq('status', 'completed');
    
    return data && data.length > 0;
  } catch (error) {
    console.error('检查任务状态失败:', error);
    return false;
  }
}

// 生成等级提升二维码
export async function generateLevelQRCode(
  userId: string,
  currentLevel: number,
  targetLevel: number
): Promise<{ qrCodeUrl: string; qrCodeContent: string; qrCodeId: string }> {
  // 生成唯一的二维码内容
  const qrCodeContent = `jws:level:${userId}:${currentLevel}:${targetLevel}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  // 使用在线二维码生成服务
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeContent)}`;
  
  // 保存到数据库
  const { data, error } = await supabase
    .from('level_qr_codes')
    .insert({
      user_id: userId,
      current_level: currentLevel,
      target_level: targetLevel,
      qr_code_content: qrCodeContent,
      qr_code_url: qrCodeUrl,
      status: 'generated'
    })
    .select('id')
    .single();
  
  if (error || !data) {
    console.error('生成等级提升二维码失败:', error);
    throw error;
  }
  
  // 更新用户状态为提升待处理
  await supabase
    .from('profiles')
    .update({ promotion_pending: true })
    .eq('id', userId);
  
  return { qrCodeUrl, qrCodeContent, qrCodeId: data.id };
}

// 验证等级提升二维码
export async function verifyLevelQRCode(
  qrCodeContent: string
): Promise<{ ok: boolean; error?: string; userId?: string; currentLevel?: number; targetLevel?: number; qrCodeId?: string }> {
  // 解析二维码内容
  const parts = qrCodeContent.split(':');
  if (parts.length < 7 || parts[0] !== 'jws' || parts[1] !== 'level') {
    return { ok: false, error: '无效的等级提升二维码' };
  }
  
  const userId = parts[2];
  const currentLevel = parseInt(parts[3]);
  const targetLevel = parseInt(parts[4]);
  
  // 检查二维码是否存在
  const { data: qrCode, error } = await supabase
    .from('level_qr_codes')
    .select('*')
    .eq('qr_code_content', qrCodeContent)
    .single();
  
  if (error || !qrCode) {
    return { ok: false, error: '二维码不存在' };
  }
  
  if (qrCode.status === 'verified') {
    return { ok: false, error: '二维码已验证' };
  }
  
  if (qrCode.status === 'expired') {
    return { ok: false, error: '二维码已过期' };
  }
  
  if (qrCode.status === 'cancelled') {
    return { ok: false, error: '二维码已取消' };
  }
  
  return { ok: true, userId, currentLevel, targetLevel, qrCodeId: qrCode.id };
}

// 更新等级提升二维码状态
export async function updateLevelQRCodeStatus(
  qrCodeId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 更新二维码状态为验证
    await supabase
      .from('level_qr_codes')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        scanned_at: new Date().toISOString()
      })
      .eq('id', qrCodeId);
    
    return { ok: true };
  } catch (error) {
    console.error('更新等级提升二维码状态失败:', error);
    return { ok: false, error: '更新等级提升二维码状态失败' };
  }
}

// 完成等级提升验证
export async function completeLevelPromotion(
  qrCodeId: string,
  userId: string,
  masterId: string,
  currentLevel: number,
  targetLevel: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 使用存储过程完成等级提升，绕过RLS权限检查
    const { data, error } = await supabase
      .rpc('complete_level_promotion', {
        p_qr_code_id: qrCodeId,
        p_user_id: userId,
        p_master_id: masterId,
        p_current_level: currentLevel,
        p_target_level: targetLevel
      });
    
    if (error) {
      console.error('完成等级提升验证失败:', error);
      return { ok: false, error: error.message || '完成等级提升验证失败' };
    }
    
    if (data && data.ok) {
      return { ok: true };
    } else {
      return { ok: false, error: data?.error || '等级提升失败' };
    }
  } catch (error) {
    console.error('完成等级提升验证失败:', error);
    return { ok: false, error: '完成等级提升验证失败' };
  }
}

// 检查等级提升状态
export async function checkLevelPromotionStatus(
  qrCodeId: string
): Promise<boolean> {
  try {
    // 使用存储过程检查等级提升状态，绕过RLS权限检查
    // 现在只根据二维码状态判断验证是否成功
    const { data, error } = await supabase
      .rpc('check_level_promotion_status', {
        p_qr_code_id: qrCodeId
      });
    
    if (error) {
      console.error('检查等级提升状态失败:', error);
      return false;
    }
    
    // 检查返回状态是否为已验证
    return data && data.status === 'verified';
  } catch (error) {
    console.error('检查等级提升状态失败:', error);
    return false;
  }
}
