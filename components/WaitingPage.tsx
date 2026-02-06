import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface WaitingPageProps {
  onRefresh: () => void;
}

export const WaitingPage: React.FC<WaitingPageProps> = ({ onRefresh }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [count, setCount] = useState(0);

  // 呼吸动画效果
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => (c + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 长按动画
  useEffect(() => {
    if (isPressing) {
      const timeout = setTimeout(() => {
        onRefresh();
        setIsPressing(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isPressing, onRefresh]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#fdfbf7] flex flex-col items-center justify-center p-8 overflow-hidden paper-texture">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { repeat: Infinity, duration: 60, ease: "linear" },
            scale: { repeat: Infinity, duration: 4, ease: "easeInOut" }
          }}
          className="absolute top-1/4 left-1/4 text-6xl opacity-20"
        >
          🌸
        </motion.div>
        <motion.div
          animate={{ 
            rotate: [360, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            rotate: { repeat: Infinity, duration: 45, ease: "linear" },
            scale: { repeat: Infinity, duration: 5, ease: "easeInOut" }
          }}
          className="absolute bottom-1/4 right-1/4 text-7xl opacity-20"
        >
          🪷
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center space-y-8 relative z-10"
      >
        {/* 主视觉 */}
        <div className="relative">
          <motion.div
            animate={{ 
              rotate: count * 90,
              scale: [1, 1.05, 1]
            }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="text-8xl mb-4"
          >
            {count === 0 && '🌫️'}
            {count === 1 && '✨'}
            {count === 2 && '🔮'}
            {count === 3 && '💫'}
          </motion.div>
          
          {/* 光环效果 */}
          <motion.div
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.1, 0.3]
            }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute inset-0 m-auto w-32 h-32 rounded-full bg-rose-200 blur-2xl -z-10"
          />
        </div>

        {/* 文字 */}
        <div className="space-y-4">
          <h1 className="text-2xl font-serif text-slate-700 italic">
            机缘未至
          </h1>
          <p className="text-sm font-serif text-slate-500 leading-relaxed max-w-xs">
            此刻，你的织梦信笺尚未被唤醒。<br/>
            请持有者赐下引渡之符，
          </p>
          <p className="text-xs font-bold text-rose-400 tracking-widest uppercase">
            方能开启此间门扉
          </p>
        </div>

        {/* 刷新按钮 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="pt-8"
        >
          <div 
            className="relative w-16 h-16 flex items-center justify-center cursor-pointer select-none"
            onMouseDown={() => setIsPressing(true)}
            onMouseUp={() => setIsPressing(false)}
            onMouseLeave={() => setIsPressing(false)}
            onTouchStart={() => setIsPressing(true)}
            onTouchEnd={() => setIsPressing(false)}
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div 
                className="w-16 h-16 rounded-full border-2 border-rose-200 opacity-40"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            </div>
            <button className="relative z-10 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center text-xl active:scale-90 transition-transform pointer-events-none">
              {isPressing ? '🔓' : '🔒'}
            </button>
            {isPressing && (
              <motion.div 
                animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="absolute inset-0 rounded-full border-2 border-rose-300"
              />
            )}
          </div>
          <p className="mt-4 text-[9px] font-bold text-rose-300 tracking-[0.2em] uppercase">
            {isPressing ? '正在解封...' : '长按 求索机缘'}
          </p>
        </motion.div>
      </motion.div>

      {/* 底部文字 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 2 }}
        className="absolute bottom-12 text-[9px] font-serif text-slate-400 italic"
      >
        缘来则聚，缘去则散
      </motion.p>
    </div>
  );
};
