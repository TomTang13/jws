import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { decrypt, isValidUUID } from '../crypto';
import { supabase } from '../supabase';

interface LandingPageProps {
  onLogin: (nickname: string, password: string, isRegister: boolean) => Promise<boolean>;
  isLoading: boolean;
  token?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, isLoading, token }) => {
  const [act, setAct] = useState<number>(1);
  const [isPressing, setIsPressing] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [validToken, setValidToken] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  // 验证 token
  useEffect(() => {
    if (token) {
      setValidating(true);
      validateToken(token);
    }
  }, [token]);

  async function validateToken(t: string) {
    try {
      const uuid = decrypt(t);
      
      // 方式1：直接用 token 解密出 UUID 验证
      if (isValidUUID(uuid)) {
        const { data } = await supabase
          .from('pre_users')
          .select('id, nickname, encrypted_url')
          .eq('id', uuid)
          .single();
        
        if (data) {
          setValidToken(data.id);
          setName(data.nickname || '');
          setAct(4);
          return;
        }
      }
      
      // 方式2：通过 encrypted_url 匹配（用户点击链接时）
      if (t) {
        const { data } = await supabase
          .from('pre_users')
          .select('id, nickname, encrypted_url, is_used')
          .eq('encrypted_url', t)
          .single();
        
        if (data) {
          if (data.is_used) {
            setLoginError('此邀请码已被使用');
          } else {
            setValidToken(data.id);
            setName(data.nickname || '');
            setAct(4);
          }
        } else {
          setLoginError('无效的邀请码');
        }
      } else {
        setLoginError('邀请码格式无效');
      }
    } catch {
      setLoginError('邀请码验证失败');
    } finally {
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

  const handleLogin = async (isRegister: boolean) => {
    if (!name.trim() || !password.trim()) {
      setLoginError('请输入昵称和密码');
      return;
    }
    
    if (password.length < 4) {
      setLoginError('密码至少4位');
      return;
    }
    
    setLoginError('');
    const success = await onLogin(name.trim(), password, isRegister);
    if (!success) {
      setLoginError(isRegister ? '注册失败' : '登录失败，请检查用户名和密码');
    }
  };

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

  // 阶段4：登录表单
  return (
    <div className="fixed inset-0 z-[100] bg-[#fdfbf7] flex flex-col items-center justify-center p-8 overflow-hidden paper-texture">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs space-y-8"
      >
        <div className="space-y-2 text-center">
           <p className="font-serif text-lg italic text-slate-700">在这本《织梦手记》里，</p>
           <p className="font-serif text-lg italic text-slate-700">我们该如何称呼你？</p>
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

            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError(''); }}
                placeholder="密码"
                disabled={isLoading}
                className="w-full bg-transparent border-b-2 border-slate-200 py-4 pl-2 pr-20 text-center text-lg focus:outline-none focus:border-[#e1a6ad] transition-colors font-serif italic"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-lg"
              >
                {showPassword ? '👁️' : '🔒'}
              </button>
            </div>

            {loginError && (
              <p className="text-xs text-red-500 text-center">{loginError}</p>
            )}

            {validToken && (
              <p className="text-xs text-green-600 text-center">✓ 邀请码验证成功</p>
            )}

            <motion.button
              onClick={() => handleLogin(false)}
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-2 ${
                isLoading ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white active:translate-y-1'
              }`}
            >
              {isLoading ? '...' : '登录'}
            </motion.button>

            <motion.button
              onClick={() => handleLogin(true)}
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-bold uppercase tracking-[0.2em] transition-all ${
                isLoading ? 'text-slate-300' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              新访客？点此注册
            </motion.button>
          </div>
        )}

        <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
          推开工坊的门 开启结缘
        </p>
      </motion.div>
    </div>
  );
};
