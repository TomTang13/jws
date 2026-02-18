
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quest } from '../src/types';
import { checkQuestStatus, expireQuestQRCode } from '../src/dataService';

interface QRModalProps {
  quest: Quest;
  qrCodeUrl: string;
  qrCodeContent: string;
  qrCodeId: string;
  onCancel: () => void;
  onSimulateVerify: () => void;
  userId: string;
}

export const QRModal: React.FC<QRModalProps> = ({ quest, qrCodeUrl, qrCodeContent, qrCodeId, onCancel, onSimulateVerify, userId }) => {
  const [countdown, setCountdown] = useState(120);

  useEffect(() => {
    // Auto-check verification status every 2 seconds
    const checkInterval = setInterval(async () => {
      try {
        console.log('Checking quest status...');
        const isCompleted = await checkQuestStatus(userId, quest.id);
        console.log('Quest status check result:', isCompleted);
        if (isCompleted) {
          // Clear the interval before completing the process
          clearInterval(checkInterval);
          // Quest has been verified, complete the process
          onSimulateVerify();
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    }, 2000);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(checkInterval);
      clearInterval(countdownInterval);
    };
  }, [quest.id, userId, onSimulateVerify]);

  // Handle countdown expiration
  useEffect(() => {
    if (countdown === 0) {
      // Expire the QR code in the database
      expireQuestQRCode(qrCodeId).then(result => {
        if (!result.ok) {
          console.error('过期二维码失败:', result.error);
        }
        // After expiring the QR code, close the modal
        onCancel();
        alert('二维码已超时失效，请重新生成');
      });
    }
  }, [countdown, onCancel, qrCodeId]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 flex items-center justify-center p-8 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl space-y-6 relative overflow-hidden"
      >
        {/* Decorative background element */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-50 rounded-full blur-3xl opacity-50"></div>

        <div className="space-y-3 z-10">
          <motion.div
            initial={{ rotate: -15 }}
            animate={{ rotate: 15 }}
            transition={{ repeat: Infinity, duration: 2, repeatType: "reverse", ease: "easeInOut" }}
            className="text-4xl mb-2"
          >
            🧶
          </motion.div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800 italic">弟子心愿核验</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Verification Required</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-3xl border-2 border-dashed border-slate-200 w-full z-10">
           <p className="text-[10px] font-black text-slate-300 uppercase mb-2">委托项目</p>
           <p className="text-sm font-bold text-slate-700">{quest.title}</p>
        </div>

        {/* Real QR Code */}
        <div className="p-4 bg-white border-4 border-slate-100 rounded-3xl shadow-inner relative group z-10 flex items-center justify-center">
          <img 
            src={qrCodeUrl} 
            alt="任务核验二维码" 
            className="w-48 h-48 object-contain"
          />
          <motion.div 
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 flex items-center justify-center"
          >
             <span className="text-4xl">🪡</span>
          </motion.div>
        </div>

        <div className="space-y-3 z-10">
          <p className="text-[10px] text-slate-400 font-serif italic">请展示给师傅核验</p>
          <div className="flex items-center justify-center gap-1">
             <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
             <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">等待师傅法力接入...</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">剩余时间</span>
            <span className="text-[10px] font-black text-rose-500">{countdown}秒</span>
          </div>
        </div>

        <div className="w-full flex flex-col gap-2 pt-2 z-10">
          <button 
            onClick={onCancel}
            className="w-full py-3 border border-slate-200 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
          >
            暂不核验 (返回)
          </button>
        </div>
      </motion.div>
    </div>
  );
};
