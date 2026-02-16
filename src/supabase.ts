import { createClient } from '@supabase/supabase-js';

// Use fixed values instead of environment variables to ensure consistency
const supabaseUrl = 'https://dbgpstacfijwubjurbec.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRiZ3BzdGFjZmlqd3VianVyYmVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwOTg1NzMsImV4cCI6MjA4NTY3NDU3M30.nCPwue-y4RxlP0t3DBwJj_owGsInJaLiHl_rrAByXXU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
