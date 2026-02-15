import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase 环境变量未配置，将使用演示模式');
}

export const supabase = createClient(
  supabaseUrl || 'https://dbgpstacfijwubjurbec.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZ3BzdGFjZmlqd3VianVyYmVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwOTg1NzMsImV4cCI6MjA4NTY3NDU3M30.nCPwue-y4RxlP0t3DBwJj_owGsInJaLiHl_rrAByXXU'
);

// 测试连接
export async function testConnection() {
  try {
    const { data, error } = await supabase.from('levels').select('count').single();
    if (error) throw error;
    console.log('✅ Supabase 连接成功，levels 表存在');
    return true;
  } catch (err: any) {
    console.warn('⚠️ Supabase 连接失败:', err.message);
    return false;
  }
}
