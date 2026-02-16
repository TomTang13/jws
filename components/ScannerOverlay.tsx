import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerOverlayProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({ onScan, onClose }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    async function setupScanner() {
      try {
        // Check if camera API is available
        if (!navigator.mediaDevices) {
          setHasPermission(false);
          setError('相机 API 不可用');
          return;
        }

        // Check if camera is available
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(d => d.kind === 'videoinput');
        
        if (!hasCamera) {
          setHasPermission(false);
          setError('未检测到相机设备');
          return;
        }

        // Create scanner instance
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        // Start scanning
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1
          },
          (decodedText) => {
            // Scan success
            onScan(decodedText);
          },
          () => {
            // QR code not found in this frame, continue scanning
          }
        );

        setHasPermission(true);
      } catch (err: any) {
        console.error("Scanner error:", err);
        setHasPermission(false);
        setError(err.message || '无法启动扫描器');
      }
    }

    setupScanner();

    return () => {
      // Cleanup
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Scanner View */}
      <div className="relative flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
        {/* QR Reader Container */}
        <div 
          id="qr-reader" 
          className="absolute inset-0"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        />

        {/* Camera permission states */}
        {hasPermission === null && (
          <div className="text-white text-center p-8 z-20">
            <div className="text-xl mb-4">正在启用法术...</div>
            <p className="text-sm opacity-60 font-serif">正在连接灵目</p>
          </div>
        )}

        {hasPermission === false && (
          <div className="text-white text-center p-8 z-20">
            <p className="text-xl mb-4">无法开启灵目</p>
            <p className="text-sm opacity-60 font-serif">{error || '请在系统设置中允许开启相机权限'}</p>
          </div>
        )}

        {/* Scanner Frame Overlay */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-64 h-64 pointer-events-none">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-lg"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-lg"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-lg"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-lg"></div>
          
          {/* Scanning Animation */}
          <motion.div 
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,1)] z-20"
          />
        </div>

        <p className="absolute bottom-24 text-white text-xs font-bold tracking-[0.3em] uppercase opacity-60 z-20">
          对准工坊二维码
        </p>
      </div>

      {/* Controls */}
      <div className="bg-slate-900 p-8 flex justify-center items-center">
        <button 
          onClick={onClose}
          className="text-white text-sm font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
        >
          取消
        </button>
      </div>
    </motion.div>
  );
};
