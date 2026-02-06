
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingScreenProps {
  onComplete: (name: string) => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({ onComplete }) => {
  const [act, setAct] = useState<number>(1);
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [name, setName] = useState('');
  const pressTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isPressing) {
      const start = Date.now();
      const duration = 2000; // 2 seconds to complete Act 2
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const currentProgress = Math.min(elapsed / duration, 1);
        setProgress(currentProgress);
        if (currentProgress >= 1) {
          clearInterval(interval);
          setAct(3);
        }
      }, 50);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isPressing]);

  const handleStartPress = () => {
    if (act === 1) setIsPressing(true);
  };

  const handleEndPress = () => {
    if (act === 1) setIsPressing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#fdfbf7] flex flex-col items-center justify-center p-8 overflow-hidden paper-texture">
      <AnimatePresence mode="wait">
        {act === 1 && (
          <motion.div 
            key="act1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center space-y-8 max-w-xs"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              className="text-6xl mb-12 opacity-80"
            >
              🧶
            </motion.div>
            
            <div className="space-y-4">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-lg font-serif"
              >
                世界太快了。
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="text-lg font-serif"
              >
                你也累了吧？
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.5 }}
                className="text-sm text-slate-400 font-serif italic"
              >
                在这里，我们不计算时间……
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 3.5 }}
                className="text-sm text-slate-400 font-serif italic"
              >
                只计算针目。
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 5 }}
              className="pt-24 flex flex-col items-center"
            >
              {/* Interaction Container - Fixed centering */}
              <div 
                className="relative w-20 h-20 flex items-center justify-center cursor-pointer select-none"
                onMouseDown={handleStartPress}
                onMouseUp={handleEndPress}
                onTouchStart={handleStartPress}
                onTouchEnd={handleEndPress}
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <motion.div 
                    className="w-20 h-20 rounded-full border-2 border-[#e1a6ad] opacity-30"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                   />
                </div>
                
                <button 
                  className="relative z-10 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-2xl active:scale-90 transition-transform pointer-events-none"
                >
                  🌀
                </button>
                
                {isPressing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="ripple-effect w-16 h-16" />
                  </div>
                )}
              </div>

              <p className="mt-8 text-[10px] font-bold text-[#e1a6ad] tracking-[0.2em] uppercase">长按 开启结界</p>
            </motion.div>
          </motion.div>
        )}

        {act === 3 && (
          <motion.div 
            key="act3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center space-y-12"
          >
            <div className="relative">
                <motion.div
                  initial={{ rotate: -180, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="text-9xl filter drop-shadow-2xl"
                >
                  🌱
                </motion.div>
                <div className="absolute inset-0 flex items-center justify-center">
                   <motion.div 
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-32 h-32 rounded-full border-4 border-[#e1a6ad]"
                   />
                </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-3xl font-black text-slate-800 italic">你好，有缘人</h2>
              <div className="space-y-2">
                <p className="text-sm font-serif italic text-slate-500">你的时间，</p>
                <p className="text-sm font-serif italic text-slate-500">值得变成摸得着的温柔。</p>
              </div>
              <div className="pt-4">
                <span className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-full text-xs font-bold text-rose-500 tracking-widest uppercase">
                  授予身份：钩针初心者 (Lv.1)
                </span>
              </div>
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
          </motion.div>
        )}

        {act === 4 && (
          <motion.div 
            key="act4"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs space-y-12"
          >
             <div className="space-y-2 text-center">
                <p className="font-serif text-lg italic text-slate-700">在这本《织梦手记》里，</p>
                <p className="font-serif text-lg italic text-slate-700">我们该如何称呼你？</p>
             </div>

             <div className="relative">
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入你的工坊代号"
                  className="w-full bg-transparent border-b-2 border-slate-200 py-4 text-center text-xl focus:outline-none focus:border-[#e1a6ad] transition-colors font-serif italic"
                />
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#e1a6ad] to-transparent transform scale-x-0 transition-transform duration-500 peer-focus:scale-x-100"></div>
             </div>

             <button
              onClick={() => name.trim() && onComplete(name.trim())}
              disabled={!name.trim()}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-3 ${
                name.trim() ? 'bg-slate-900 text-white active:translate-y-1' : 'bg-slate-100 text-slate-300 grayscale cursor-not-allowed'
              }`}
             >
               <span className="text-lg">🪡</span>
               开始修行
             </button>

             <p className="text-center text-[9px] font-black text-slate-300 uppercase tracking-widest">
               推开工坊的门 开启结缘
             </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Background Yarn */}
      {isPressing && (
        <svg className="absolute inset-0 pointer-events-none opacity-20">
          <motion.path
            d={`M ${Math.random()*400} 0 Q ${Math.random()*400} ${Math.random()*800} ${Math.random()*400} 1000`}
            fill="none"
            stroke="#e1a6ad"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2 }}
          />
        </svg>
      )}
    </div>
  );
};
