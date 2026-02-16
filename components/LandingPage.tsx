import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../src/supabase';

interface LandingPageProps {
  onLogin: (nickname: string, preUserId: string) => Promise<boolean>;
  onAutoLogin: (preUserId: string, token: string) => Promise<{ ok: boolean; error?: string; dailyLoginCount?: number; dailyLoginLimit?: number }>;
  isLoading: boolean;
  token?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onAutoLogin, isLoading, token }) => {
  const [act, setAct] = useState<number>(1);
  const [isPressing, setIsPressing] = useState(false);
  const [name, setName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [validToken, setValidToken] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);
  const [preUserNickname, setPreUserNickname] = useState<string | null>(null);
  const [preUserId, setPreUserId] = useState<string | null>(null);

  // 验证 token（t 为实物密钥，对应 pre_users.encrypted_string）
  useEffect(() => {
    if (token) {
      setValidating(true);
      validateToken(token);
    }
  }, [token]);

  // 已使用密钥：验证通过后自动登录（仅凭 t 即可进入，无需密码）
  useEffect(() => {
    if (!autoLoggingIn || !preUserId) return;
    const rawToken = validToken ?? token ?? '';
    let cancelled = false;
    onAutoLogin(preUserId, rawToken).then((res) => {
      if (cancelled) return;
      setAutoLoggingIn(false);
      if (!res.ok) {
        if (res.error === '仙缘用尽') {
          // 登录次数超限，进入仙缘用尽页面
          setAct(5);
        } else {
          setLoginError(res.error || '自动登录失败，请重试。');
        }
      }
    });
    return () => { cancelled = true; };
  }, [autoLoggingIn, preUserId, validToken, token]);

  async function validateToken(t: string) {
    console.log('[validateToken] 开始验证邀请码:', t);
    try {
      const trimmed = (t || '').trim();
      if (!trimmed) {
        console.log('[validateToken] 邀请码为空');
        setLoginError('邀请码不能为空');
        setValidating(false);
        return;
      }
      console.log('[validateToken] 查询 pre_users 表，encrypted_string:', trimmed);
      const { data, error } = await supabase
        .from('pre_users')
        .select('id, nickname, is_used, used_by')
        .eq('encrypted_string', trimmed)
        .maybeSingle();

      console.log('[validateToken] 查询结果:', { data, error });
      if (error) {
        console.error('[validateToken] 查询失败', error);
        setLoginError(`验证失败: ${error.message}`);
        setValidating(false);
        return;
      }
      if (!data) {
        console.error('[validateToken] 未找到邀请码记录:', trimmed);
        setLoginError('无效的邀请码（请确认该密钥已在后台 pre_users 表中录入）');
        setValidating(false);
        return;
      }

      console.log('[validateToken] 邀请码验证成功:', data);
      setPreUserId(data.id);
      setValidToken(t);
      setValidating(false);

      if (data.is_used) {
        console.log('[validateToken] 邀请码已使用，开始自动登录:', data.id);
        // 已使用：进入「正在进入工坊…」并触发自动登录，不显示新手引导
        setAutoLoggingIn(true);
      } else {
        console.log('[validateToken] 邀请码首次使用，进入新手引导:', data.id);
        // 首次使用：进入新手引导，落款时只填昵称，建 profile、改 is_used 并登录
        // 如果 pre_users 表中有 nickname，则预填，否则让用户输入
        setPreUserNickname(data.nickname || null);
        // 只有当 pre_users 表中有 nickname 时才设置 name，否则保持为空，让用户输入
        if (data.nickname) {
          setName(data.nickname);
        } else {
          setName('');
        }
        setAct(1);
      }
    } catch (e: any) {
      console.error('[validateToken] 验证异常:', e);
      setLoginError(`邀请码验证失败: ${e.message}`);
      setValidating(false);
    }
  }

  // 长按动画
  useEffect(() => {
    if (isPressing && act === 1) {
      const timeout = setTimeout(() => {
        setAct(3);
        setIsPressing(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isPressing, act]);

  const handleSubmit = async () => {
    console.log('[LandingPage] 提交表单，用户输入的昵称:', name);
    if (!name.trim()) {
      setLoginError('请输入工坊代号（昵称）');
      return;
    }
    if (!preUserId) {
      setLoginError('邀请码无效');
      return;
    }
    setLoginError('');
    console.log('[LandingPage] 调用 onLogin，传递昵称:', name.trim());
    const success = await onLogin(name.trim(), preUserId);
    if (!success) setLoginError('落款失败，请重试');
  };

  // 已使用密钥：只显示「正在进入工坊…」，凭密钥即可进入，无需密码
  if (autoLoggingIn) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#fdfbf7] flex flex-col items-center justify-center p-8 overflow-hidden paper-texture">
        <div className="text-6xl mb-8 opacity-80">🧶</div>
        <p className="text-sm text-slate-500 font-serif">正在进入工坊...</p>
        <p className="text-[10px] text-slate-400 mt-2 font-serif">凭密钥即可进入，无需密码</p>
        {loginError && <p className="mt-4 text-xs text-red-500 text-center max-w-xs">{loginError}</p>}
      </div>
    );
  }

  // 阶段1：开场
  if (act === 1) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#fdfbf7] flex flex-col items-center justify-center p-8 overflow-hidden paper-texture">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="text-6xl mb-12 opacity-80"
        >
          🧶
        </motion.div>
        
        <div className="space-y-4 text-center">
          <p className="text-lg font-serif">世界太快了。</p>
          <p className="text-lg font-serif">你也累了吧？</p>
          <p className="text-sm text-slate-400 font-serif italic">在这里，我们不计算时间……</p>
          <p className="text-sm text-slate-400 font-serif italic">只计算针目。</p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5 }}
          className="pt-24 flex flex-col items-center"
        >
          <div 
            className="relative w-20 h-20 flex items-center justify-center cursor-pointer select-none"
            onMouseDown={() => isLoading || setIsPressing(true)}
            onMouseUp={() => setIsPressing(false)}
            onMouseLeave={() => setIsPressing(false)}
            onTouchStart={() => isLoading || setIsPressing(true)}
            onTouchEnd={() => setIsPressing(false)}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <motion.div 
                className="w-20 h-20 rounded-full border-2 border-[#e1a6ad] opacity-30"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
               />
            </div>
            <button className="relative z-10 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl active:scale-90 transition-transform pointer-events-none">
              🌀
            </button>
            {isPressing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div 
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-16 h-16 rounded-full border-2 border-[#e1a6ad]"
                />
              </div>
            )}
          </div>
          <p className="mt-8 text-[10px] font-bold text-[#e1a6ad] tracking-[0.2em] uppercase">
            {isLoading ? '连接中...' : '长按 开启结界'}
          </p>
          {loginError && (
            <p className="mt-6 text-xs text-red-500 text-center max-w-xs px-4">{loginError}</p>
          )}
        </motion.div>
      </div>
    );
  }

  // 阶段3：开场动画
  if (act === 3) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#fdfbf7] flex flex-col items-center justify-center p-8 overflow-hidden paper-texture">
        <motion.div
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          className="text-9xl"
        >
          🌱
        </motion.div>
        
        <div className="space-y-6 text-center">
          <h2 className="text-3xl font-black text-slate-800 italic">你好，有缘人</h2>
          <p className="text-sm font-serif italic text-slate-500">你的时间，值得变成摸得着的温柔。</p>
          <span className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-full text-xs font-bold text-rose-500 tracking-widest uppercase">
            授予身份：钩针初心者 (Lv.1)
          </span>
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          onClick={() => setAct(4)}
          className="px-8 py-3 bg-slate-800 text-white rounded-full text-sm font-bold tracking-widest shadow-xl active:scale-95 transition-all"
        >
          落款领新手手记
        </motion.button>
      </div>
    );
  }

  // 阶段5：仙缘用尽
  if (act === 5) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#fdfbf7] flex flex-col items-center justify-center p-8 overflow-hidden paper-texture">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8"
        >
          <div className="text-8xl opacity-80">🌙</div>
          <h2 className="text-2xl font-black text-slate-800 italic">仙缘用尽</h2>
          <p className="text-sm font-serif text-slate-600 max-w-xs">
            今日进入工坊的次数已达上限，请明日再来。
            每一次的相遇，都值得珍惜。
          </p>
          <p className="text-xs font-serif text-slate-400">
            明日辰时（早上7点）将恢复仙缘
          </p>
          <motion.button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-slate-800 text-white rounded-full text-sm font-bold tracking-widest shadow-xl active:scale-95 transition-all"
          >
            明日再来
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // 阶段4：登录表单
  return (
    <div className="fixed inset-0 z-[100] bg-[#fdfbf7] flex flex-col items-center justify-center p-8 overflow-hidden paper-texture">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs space-y-8"
      >
        <div className="space-y-2 text-center">
           <p className="font-serif text-lg italic text-slate-700">
             {validToken ? '有缘人，请落款' : '在这本《织梦手记》里，'}
           </p>
           {preUserNickname && (
             <p className="font-serif text-lg italic text-rose-500">
               我们该如何称呼你，{preUserNickname}？
             </p>
           )}
        </div>

        {validating ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-4">🔐</div>
            <p className="text-sm text-slate-500">正在验证邀请码...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <input 
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setLoginError(''); }}
                placeholder="工坊代号（昵称）"
                disabled={isLoading}
                className="w-full bg-transparent border-b-2 border-slate-200 py-4 pl-2 pr-10 text-center text-lg focus:outline-none focus:border-[#e1a6ad] transition-colors font-serif italic"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xl">👤</span>
            </div>

            {loginError && (
              <p className="text-xs text-red-500 text-center">{loginError}</p>
            )}

            <motion.button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-2 ${
                isLoading ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white active:translate-y-1'
              }`}
            >
              {isLoading ? '...' : '落款并登录'}
            </motion.button>

            <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
              推开工坊的门 开启结缘
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
