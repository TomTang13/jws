
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScannerOverlayProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error("Camera access denied", err);
        setHasPermission(false);
      }
    }
    setupCamera();

    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const simulateScan = () => {
    onScan("WEAVING_GUILD_CHECKIN");
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Camera View */}
      <div className="relative flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
        {hasPermission ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : hasPermission === false ? (
          <div className="text-white text-center p-8">
            <p className="text-xl mb-4">无法开启灵目</p>
            <p className="text-sm opacity-60 font-serif">请在系统设置中允许开启相机权限，以便识别工坊秘钥。</p>
          </div>
        ) : (
          <div className="text-white opacity-40 italic">正在启用法术...</div>
        )}

        {/* Scanner UI Overlay */}
        <div className="relative z-10 w-64 h-64">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-lg"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-lg"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-lg"></div>
          
          {/* Scanning Line */}
          <motion.div 
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,1)] z-20"
          />
        </div>

        <p className="absolute bottom-24 text-white text-xs font-bold tracking-[0.3em] uppercase opacity-60">
          对准工坊二维码
        </p>
      </div>

      {/* Controls */}
      <div className="bg-slate-900 p-8 flex justify-between items-center">
        <button onClick={onClose} className="text-white text-sm font-bold uppercase tracking-widest opacity-50">取消</button>
        <button 
          onClick={simulateScan}
          className="px-6 py-3 bg-amber-500 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-900/40"
        >
          模拟识别成功
        </button>
      </div>
    </motion.div>
  );
};
