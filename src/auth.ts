import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  nickname: string;
  email?: string;
  level: number;
  coins: number;
  yc: number;
  inspiration: number;
  skill_path?: string;
  play_style: 'Artisan' | 'Collector' | 'Hybrid';
  inventory: string[];
  created_at: string;
}

// 注册
export async function signUp(nickname: string, password: string, preUserId?: string) {
  const { data, error } = await supabase.auth.signUp({
    email: `${nickname}@temp.local`,
    password: password,
    options: {
      data: { nickname }
    }
  });
  
  if (error) return { error };
  
  // 创建用户档案
  if (data.user) {
    // 如果是预注册用户，标记为已使用
    if (preUserId) {
      await supabase.from('pre_users').update({
        is_used: true,
        used_by: data.user.id
      }).eq('id', preUserId);
    }
    
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      nickname: nickname,
      level: 1,
      coins: 2000,
      yc: 0,
      inspiration: 0,
      play_style: 'Hybrid',
      inventory: []
    });
    
    if (profileError) {
      console.error('创建档案失败:', profileError);
    }
  }
  
  return { data, error };
}

// 登录
export async function signIn(nickname: string, password: string) {
  // 查找用户邮箱
  const { data: userData, error: findError } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('nickname', nickname)
    .single();
  
  if (findError || !userData) {
    return { error: { message: '用户不存在' } };
  }
  
  // 使用邮箱登录
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${nickname}@temp.local`,
    password: password
  });
  
  return { data, error };
}

// 退出
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// 获取当前用户
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return profile;
}

// 更新用户数据
export async function updateProfile(updates: Partial<UserProfile>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: '未登录' } };
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();
  
  return { data, error };
}

// 监听登录状态变化
export function onAuthChange(callback: (user: UserProfile | null) => void) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      callback(profile as UserProfile);
    } else if (event === 'SIGNED_OUT') {
      callback(null);
    }
  });
}
