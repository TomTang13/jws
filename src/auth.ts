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
  is_master: boolean;
}

// 昵称登录用占位邮箱（Supabase 校验格式）
const placeholderEmail = (nickname: string) => `${encodeURIComponent(nickname)}@users.jws.alincraft.com`;

// 仅借用邮箱登录机制，不真正发邮件；Supabase 若开启「确认邮件」会报发信错误，此处视为可忽略
const isConfirmationEmailError = (msg: string) =>
  /confirmation\s*email|sending.*email|send.*email/i.test(msg);

// 注册
export async function signUp(nickname: string, password: string, preUserId?: string) {
  console.log('[signUp] 开始注册流程:', { nickname, preUserId });
  const { data, error } = await supabase.auth.signUp({
    email: placeholderEmail(nickname),
    password: password,
    options: {
      data: { nickname }
    }
  });

  console.log('[signUp] 注册结果:', { data, error });
  
  // 若是「发送确认邮件」类错误但用户已创建：仍完成建档并尝试直接登录（不依赖邮件）
  if (error && data?.user && isConfirmationEmailError(error.message)) {
    console.log('[signUp] 遇到邮件确认错误，开始创建档案');
    if (preUserId) {
      console.log('[signUp] 更新 pre_users 表:', { preUserId, userId: data.user.id });
      await supabase.from('pre_users').update({
        is_used: true,
        used_by: data.user.id
      }).eq('id', preUserId);
    }
    
    // 检查 profiles 表中是否已存在记录
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();
    
    if (existingProfile) {
      // 已存在记录，更新它
      console.log('[signUp] 更新 profiles 表:', { userId: data.user.id, nickname });
      const { error: profileError } = await supabase.from('profiles').update({
        nickname: nickname,
        level: 1,
        coins: 2000,
        yc: 0,
        inspiration: 0,
        play_style: 'Hybrid',
        inventory: [],
        is_master: false
      }).eq('id', data.user.id);
      if (profileError) {
        console.error('[signUp] 更新档案失败:', profileError);
      } else {
        console.log('[signUp] 更新档案成功');
      }
    } else {
      // 不存在记录，插入新记录
      console.log('[signUp] 插入 profiles 表:', { userId: data.user.id, nickname });
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        nickname: nickname,
        level: 1,
        coins: 2000,
        yc: 0,
        inspiration: 0,
        play_style: 'Hybrid',
        inventory: [],
        is_master: false
      });
      if (profileError) {
        console.error('[signUp] 创建档案失败:', profileError);
      } else {
        console.log('[signUp] 创建档案成功');
      }
    }
    
    const signInResult = await signInWithPasswordOnly(nickname, password);
    if (!signInResult.error) return { data: signInResult.data };
    // 若项目强制邮件确认，登录会失败，提示在控制台关闭「确认邮件」
    return {
      error: {
        message:
          '注册已完成。请在 Supabase 控制台关闭「确认邮件」（Authentication → Providers → Email）后刷新页面重新登录。'
      }
    };
  }

  if (error) return { error };

  // 创建用户档案
  if (data.user) {
    console.log('[signUp] 注册成功，开始创建档案');
    if (preUserId) {
      console.log('[signUp] 更新 pre_users 表:', { preUserId, userId: data.user.id });
      await supabase.from('pre_users').update({
        is_used: true,
        used_by: data.user.id
      }).eq('id', preUserId);
    }
    
    // 检查 profiles 表中是否已存在记录
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();
    
    if (existingProfile) {
      // 已存在记录，更新它
      console.log('[signUp] 更新 profiles 表:', { userId: data.user.id, nickname });
      const { error: profileError } = await supabase.from('profiles').update({
        nickname: nickname,
        level: 1,
        coins: 2000,
        yc: 0,
        inspiration: 0,
        play_style: 'Hybrid',
        inventory: [],
        is_master: false
      }).eq('id', data.user.id);
      if (profileError) {
        console.error('[signUp] 更新档案失败:', profileError);
      } else {
        console.log('[signUp] 更新档案成功');
      }
    } else {
      // 不存在记录，插入新记录
      console.log('[signUp] 插入 profiles 表:', { userId: data.user.id, nickname });
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        nickname: nickname,
        level: 1,
        coins: 2000,
        yc: 0,
        inspiration: 0,
        play_style: 'Hybrid',
        inventory: [],
        is_master: false
      });
      if (profileError) {
        console.error('[signUp] 创建档案失败:', profileError);
      } else {
        console.log('[signUp] 创建档案成功');
      }
    }
  }

  return { data, error };
}

/** 实物密钥 t 对应的账号使用统一派生密码，不向用户展示 */
export function getTokenBasedPassword(preUserId: string): string {
  return `jws:${preUserId}`;
}

/** 服务端将密钥对应用户的 Auth 密码同步为派生密码，保证「仅凭 t 即可登录」。需部署 Edge Function sync-key-password。 */
export async function syncKeyPassword(preUserId: string, token: string): Promise<{ ok: boolean; error?: string }> {
  const trimmedToken = (token || '').trim();
  console.log('[syncKeyPassword] 调用参数:', { preUserId, token: trimmedToken });
  try {
    const { data, error } = await supabase.functions.invoke('sync-key-password', {
      body: { preUserId, token: trimmedToken },
    });
    console.log('[syncKeyPassword] 调用结果:', { data, error });
    if (error) {
      console.error('[syncKeyPassword] Edge Function 错误:', { 
        message: error.message, 
        status: error.status, 
        details: error.details 
      });
      return { ok: false, error: `Edge Function 错误: ${error.message} (状态码: ${error.status})` };
    }
    if (data?.error) {
      console.error('[syncKeyPassword] 服务端返回错误:', data.error);
      return { ok: false, error: String(data.error) };
    }
    console.log('[syncKeyPassword] 密钥同步成功');
    return { ok: true };
  } catch (e: any) {
    console.error('[syncKeyPassword] 调用异常:', { message: e.message, stack: e.stack });
    return { ok: false, error: `调用异常: ${e.message}` };
  }
}

// 仅用昵称+密码调 Auth，不查 profiles（用于自动登录等已确知昵称的场景，避免未登录时 RLS 导致「用户不存在」）
export async function signInWithPasswordOnly(nickname: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email: placeholderEmail(nickname),
    password: password
  });
}

// 登录（会先按昵称查 profiles，未登录时若 RLS 禁止匿名读会报「用户不存在」）
export async function signIn(nickname: string, password: string) {
  const { data: userData, error: findError } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('nickname', nickname)
    .single();

  if (findError || !userData) {
    return { error: { message: '用户不存在' } };
  }

  return await signInWithPasswordOnly(nickname, password);
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
