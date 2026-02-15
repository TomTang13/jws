// 凭密钥 t 同步对应用户的 Auth 邮箱+密码为前端约定格式，保证「仅凭 t 即可登录」。
// 仅当 pre_users 中 id=preUserId 且 encrypted_string=token 且 is_used 且 used_by 存在时执行。
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const derivedPassword = (preUserId: string) => `jws:${preUserId}`;
const placeholderEmail = (nickname: string) =>
  `${encodeURIComponent(nickname)}@users.jws.alincraft.com`;

function jsonResponse(body: object, status: number, headers = corsHeaders) {
  return Response.json(body, { status, headers });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    console.log('=== 开始处理密钥同步请求 ===');
    
    // 解析请求体
    const { preUserId, token } = (await req.json()) as { preUserId?: string; token?: string };
    const t = typeof token === 'string' ? token.trim() : '';
    const id = typeof preUserId === 'string' ? preUserId.trim() : '';
    
    console.log('请求参数:', { preUserId: id, token: t });
    
    // 验证参数
    if (!id || !t) {
      console.error('参数验证失败: 缺少 preUserId 或 token');
      return jsonResponse({ error: 'missing preUserId or token' }, 400);
    }

    // 检查环境变量
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('环境变量检查:', { 
      supabaseUrl: !!supabaseUrl, 
      supabaseServiceRoleKey: !!supabaseServiceRoleKey 
    });
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('环境变量配置失败: 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
      return jsonResponse({ error: 'missing environment variables' }, 500);
    }

    // 创建 Supabase 客户端
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log('Supabase 客户端创建成功');

    // 查询 pre_users 表
    console.log('查询 pre_users 表，id:', id);
    const { data: row, error: rowError } = await supabaseAdmin
      .from('pre_users')
      .select('id, encrypted_string, is_used, used_by')
      .eq('id', id)
      .single();

    console.log('pre_users 查询结果:', { row, rowError });
    
    if (rowError || !row) {
      console.error('pre_users 查询失败:', rowError?.message || '未找到记录');
      return jsonResponse({ error: `pre_user not found: ${rowError?.message || '未找到记录'}` }, 404);
    }
    
    // 验证 token 匹配
    console.log('验证 token 匹配:', { stored: row.encrypted_string, provided: t });
    if (row.encrypted_string !== t) {
      console.error('token 不匹配:', { stored: row.encrypted_string, provided: t });
      return jsonResponse({ error: 'token mismatch' }, 403);
    }
    
    // 验证密钥状态
    console.log('验证密钥状态:', { is_used: row.is_used, used_by: row.used_by });
    if (!row.is_used || !row.used_by) {
      console.error('密钥未关联用户:', { is_used: row.is_used, used_by: row.used_by });
      return jsonResponse({ error: 'key not linked to user' }, 403);
    }

    // 查询 profiles 表
    console.log('查询 profiles 表，id:', row.used_by);
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('nickname')
      .eq('id', row.used_by)
      .single();

    console.log('profiles 查询结果:', { profile, profileError });
    
    if (profileError || !profile) {
      console.error('profiles 查询失败:', profileError?.message || '未找到记录');
      return jsonResponse({ error: `profile not found: ${profileError?.message || '未找到记录'}` }, 404);
    }

    // 生成密码和邮箱
    const nickname = profile.nickname;
    const email = placeholderEmail(nickname);
    const password = derivedPassword(id);
    
    console.log('生成登录凭证:', { nickname, email, password });

    // 更新用户密码
    console.log('更新用户密码，userId:', row.used_by);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(row.used_by, {
      email,
      password,
      email_confirm: true,
    });

    if (updateError) {
      console.error('更新用户密码失败:', updateError.message);
      return jsonResponse({ error: `update user failed: ${updateError.message}` }, 500);
    }
    
    console.log('密钥同步成功，userId:', row.used_by);
    return jsonResponse({ ok: true }, 200);
  } catch (e: any) {
    console.error('处理请求异常:', e.message, e.stack);
    return jsonResponse({ error: `internal error: ${e.message}` }, 500);
  }
});
