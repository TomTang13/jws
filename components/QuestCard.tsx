
import React, { useState } from 'react';
import { Quest } from '../src/types';

interface QuestCardProps {
  quest: Quest;
  playerLevel: number;
  isCompleted?: boolean;
  isPending?: boolean;
  canAfford?: boolean;
  onAccept: (id: string) => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({ quest, playerLevel, isCompleted, isPending, canAfford = true, onAccept }) => {
  const isLocked = playerLevel < quest.targetLv;
  const [isTearing, setIsTearing] = useState(false);

  const handleTear = () => {
    if (isLocked || isCompleted || isPending || !canAfford) return;
    setIsTearing(true);
    setTimeout(() => {
      onAccept(quest.id);
      setIsTearing(false);
    }, 600);
  };

  const getTheme = () => {
    switch(quest.type) {
      case 'patron': return { bg: 'bg-rose-50', border: 'border-rose-200', tape: 'bg-rose-300', text: 'text-rose-900', label: '限定通告' };
      case 'labor': return { bg: 'bg-emerald-50', border: 'border-emerald-200', tape: 'bg-emerald-300', text: 'text-emerald-900', label: '工坊清单' };
      default: return { bg: 'bg-amber-50', border: 'border-amber-100', tape: 'bg-amber-200', text: 'text-amber-900', label: '今日心情' };
    }
  };

  const theme = getTheme();

  return (
    <div className={`relative transition-all duration-700 transform ${isTearing ? 'translate-y-20 opacity-0 rotate-6 scale-90' : ''}`}>
      {/* Washi Tape visual */}
      <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 ${theme.tape} opacity-60 z-10 rounded-sm transform rotate-1`}></div>
      
      <div className={`p-6 pt-8 rounded-sm border shadow-sm transition-all ${
        isCompleted ? 'bg-gray-100 border-gray-200 opacity-60 grayscale' : 
        isPending ? 'bg-amber-50 border-amber-300 shadow-inner' :
        isLocked ? 'bg-slate-50 border-slate-100 opacity-40' : `${theme.bg} ${theme.border}`
      }`}>
        <div className="flex justify-between items-start mb-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-current ${theme.text} opacity-80 uppercase tracking-tighter`}>
            {isPending ? '待核验' : theme.label}
          </span>
          <span className="text-[10px] font-bold text-slate-300">Lv.{quest.targetLv}+</span>
        </div>

        <h3 className={`font-bold text-lg mb-1 ${theme.text}`}>{quest.title}</h3>
        <p className={`text-xs opacity-75 mb-4 leading-relaxed line-clamp-2`}>{quest.description}</p>
        
        <div className="flex justify-between items-end border-t border-black/5 pt-4 mt-2">
          <div className="flex flex-col">
            <div className="flex gap-2">
              <span className="text-xs font-bold text-emerald-600">+{quest.insReward} 灵感</span>
              {quest.ycReward > 0 && <span className="text-xs font-bold text-amber-600">+{quest.ycReward} YC</span>}
            </div>
            {quest.cost && <span className="text-[10px] font-bold text-rose-500 mt-1">支出: ¥{quest.cost}</span>}
          </div>
          
          <button
            disabled={isLocked || isCompleted || isPending || !canAfford}
            onClick={handleTear}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
              isCompleted ? 'text-slate-400' :
              isPending ? 'bg-amber-400 text-white' :
              !canAfford ? 'bg-rose-100 text-rose-400' :
              isLocked ? 'bg-slate-100 text-slate-300' : 
              'bg-white border border-current shadow-sm active:scale-95'
            } ${theme.text}`}
          >
            {isCompleted ? '愿望已达成' : isPending ? '等待师傅核验' : !canAfford ? '灵石不足' : isLocked ? '机缘未到' : '领取心愿'}
          </button>
        </div>
      </div>
    </div>
  );
};
