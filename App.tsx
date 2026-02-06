
import React, { useState, useEffect } from 'react';
import { LEVELS, QUESTS, SKILL_PATHS, GUILD_SHOP } from './constants';
import { PlayerStats, Realm, SkillPathId, Quest } from './types';
import { QuestCard } from './components/QuestCard';
import { LandingScreen } from './components/LandingScreen';
import { QRModal } from './components/QRModal';
import { ScannerOverlay } from './components/ScannerOverlay';
import { motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  const [player, setPlayer] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem('jw_dream_book_v4');
    if (saved) return JSON.parse(saved);
    return {
      hasOnboarded: false,
      level: 1,
      coins: 2000,
      yc: 0,
      inspiration: 0,
      completedQuests: [],
      inventory: [],
      playStyle: 'Hybrid'
    };
  });

  const [activeTab, setActiveTab] = useState<'map' | 'quests' | 'shop' | 'profile'>('map');
  const [questSubTab, setQuestSubTab] = useState<'daily' | 'labor' | 'patron'>('daily');
  const [showAscendModal, setShowAscendModal] = useState(false);
  
  const [pendingQuest, setPendingQuest] = useState<Quest | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    localStorage.setItem('jw_dream_book_v4', JSON.stringify(player));
  }, [player]);

  const handleOnboardingComplete = (name: string) => {
    setPlayer(prev => ({
      ...prev,
      playerName: name,
      hasOnboarded: true
    }));
  };

  if (!player.hasOnboarded) {
    return <LandingScreen onComplete={handleOnboardingComplete} />;
  }

  const currentLevelData = LEVELS[player.level - 1];
  const canAscend = player.inspiration >= currentLevelData.inspirationRequired;

  const handleAscend = () => {
    if (canAscend && player.level < 10) {
      setPlayer(prev => ({
        ...prev,
        level: prev.level + 1,
      }));
      setShowAscendModal(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleQuestAction = (id: string) => {
    const quest = QUESTS.find(q => q.id === id);
    if (!quest) return;
    if (quest.cost && player.coins < quest.cost) return;
    setPendingQuest(quest);
  };

  const finalizeQuest = (questToComplete: Quest) => {
    setPlayer(prev => {
      let newStyle = prev.playStyle;
      if (questToComplete.type === 'patron') newStyle = prev.playStyle === 'Artisan' ? 'Hybrid' : 'Collector';
      if (questToComplete.type === 'labor') newStyle = prev.playStyle === 'Collector' ? 'Hybrid' : 'Artisan';

      return {
        ...prev,
        coins: prev.coins - (questToComplete.cost || 0),
        yc: prev.yc + questToComplete.ycReward,
        inspiration: prev.inspiration + questToComplete.insReward,
        completedQuests: [...prev.completedQuests, questToComplete.id],
        playStyle: newStyle
      };
    });
    
    setPendingQuest(null);
    alert(`核验成功！心愿「${questToComplete.title}」已圆满达成。`);
  };

  const handleScanSuccess = (data: string) => {
    setShowScanner(false);
    if (pendingQuest) {
      finalizeQuest(pendingQuest);
    } else {
      alert("秘钥识别成功：工坊签到完成！获得 10 织梦币 (YC)");
      setPlayer(prev => ({ ...prev, yc: prev.yc + 10 }));
    }
  };

  const handleBuyItem = (itemId: string, cost: number) => {
    if (player.yc < cost) {
      alert("织梦币(YC)不足，多去完成心愿吧。");
      return;
    }
    setPlayer(prev => ({
      ...prev,
      yc: prev.yc - cost,
      inventory: [...prev.inventory, itemId]
    }));
    alert("兑换成功，凭证已入乾坤袋。");
  };

  const getRealmStyles = (realm: Realm) => {
    if (realm === Realm.SPROUT) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    if (realm === Realm.BLOOM) return 'text-rose-700 bg-rose-50 border-rose-100';
    return 'text-amber-700 bg-amber-50 border-amber-100';
  };

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24 bg-[#fcfaf7] relative shadow-2xl flex flex-col font-serif paper-texture">
      <header className="p-6 bg-white border-b sticky top-0 z-40 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter">织梦手记</h1>
            <p className="text-[9px] uppercase tracking-widest text-amber-500 font-bold">
              {player.playerName} 的工坊 · {player.level} 境
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-100 shadow-sm">
              YC: {player.yc}
            </div>
            <div className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[10px] font-bold border border-slate-100">
              灵石: {player.coins}
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">灵感值</span>
            <span className="text-[10px] font-bold text-slate-800">{player.inspiration} / {currentLevelData.inspirationRequired}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 via-rose-300 to-amber-400 transition-all duration-1000"
              style={{ width: `${Math.min((player.inspiration / currentLevelData.inspirationRequired) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      </header>

      <main className="p-5 flex-1">
        {activeTab === 'map' && (
          <div className="fade-in space-y-6">
            <div className="bg-white p-7 rounded-2xl shadow-sm border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-3xl -z-0 translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-white text-3xl font-black shadow-lg transform -rotate-3 border-4 border-white">
                    {player.level}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800">{currentLevelData.title}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getRealmStyles(currentLevelData.realm)}`}>
                      {currentLevelData.realm}
                    </span>
                  </div>
                </div>
                <div className="p-5 bg-[#fefcf9] rounded-xl border border-dashed border-slate-200">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 italic">本阶里程碑作品</h3>
                  <p className="text-sm font-medium leading-relaxed text-slate-700">“{currentLevelData.exam}”</p>
                </div>
                <button 
                  onClick={() => setShowAscendModal(true)}
                  disabled={!canAscend}
                  className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all transform active:scale-95 shadow-md ${
                    canAscend ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-50 text-slate-300 border'
                  }`}
                >
                  {canAscend ? '灵感充沛 · 请求晋升' : `还需 ${currentLevelData.inspirationRequired - player.inspiration} 灵感`}
                </button>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scroll-hide px-1">
              {SKILL_PATHS.map(path => (
                <div key={path.id} className={`min-w-[150px] p-5 rounded-2xl border text-center transition-all bg-white shadow-sm ${
                  player.skillPath === path.id ? 'border-rose-400 bg-rose-50/30' : 'border-slate-100'
                } ${player.level < 3 ? 'opacity-30 grayscale' : ''}`}>
                  <span className="text-4xl block mb-3">{path.icon}</span>
                  <h4 className="text-sm font-bold text-slate-800">{path.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{path.focus}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'quests' && (
          <div className="fade-in">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <span className="text-2xl">📋</span> 心愿看板
            </h2>
            <div className="flex bg-slate-100 p-1 rounded-xl mb-8 shadow-inner">
              {[
                { id: 'daily', label: '今日心情', color: 'text-amber-700' },
                { id: 'labor', label: '工坊清单', color: 'text-emerald-700' },
                { id: 'patron', label: '限定通告', color: 'text-rose-700' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setQuestSubTab(tab.id as any)}
                  className={`flex-1 py-2.5 text-[10px] font-bold rounded-lg transition-all ${
                    questSubTab === tab.id ? 'bg-white shadow-sm ' + tab.color : 'text-slate-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="space-y-6">
              {QUESTS.filter(q => q.type === questSubTab).map(quest => (
                <QuestCard 
                  key={quest.id} 
                  quest={quest} 
                  playerLevel={player.level} 
                  isCompleted={player.completedQuests.includes(quest.id)}
                  isPending={pendingQuest?.id === quest.id}
                  canAfford={!quest.cost || player.coins >= quest.cost}
                  onAccept={handleQuestAction}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="fade-in space-y-6">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span className="text-2xl">🏛️</span> 织梦阁
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {GUILD_SHOP.map(item => (
                <div key={item.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col items-center text-center">
                  <span className="text-4xl mb-4 transform transition-transform hover:scale-110">{item.icon}</span>
                  <h4 className="text-xs font-black text-slate-800 mb-1">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 h-10 line-clamp-2 mb-4 leading-relaxed">{item.description}</p>
                  <button 
                    onClick={() => handleBuyItem(item.id, item.cost)}
                    className="w-full py-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-md"
                  >
                    {item.cost} YC
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="fade-in space-y-6">
            <div className="bg-white p-8 rounded-2xl border text-center relative shadow-sm">
              <div className="w-24 h-24 mx-auto mb-5 rounded-full border-4 border-rose-100 overflow-hidden bg-slate-50 p-1">
                 <img className="w-full h-full rounded-full" src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${player.inspiration}`} alt="Avatar" />
              </div>
              <h2 className="text-xl font-black text-slate-800">{player.playerName}</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">第 {player.level} 境 织梦人</p>
              <p className="text-[10px] mt-2 text-rose-500 font-bold uppercase tracking-widest">{player.playStyle} 流派修行中</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border text-center shadow-sm">
                <span className="text-[10px] block font-bold text-slate-300 uppercase mb-1">织梦币 (YC)</span>
                <span className="text-xl font-black text-amber-600">{player.yc}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border text-center shadow-sm">
                <span className="text-[10px] block font-bold text-slate-300 uppercase mb-1">已成心愿</span>
                <span className="text-xl font-black text-slate-800">{player.completedQuests.length}</span>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl text-white shadow-xl">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-rose-300">乾坤袋</h3>
              <div className="flex flex-wrap gap-3">
                {player.inventory.map((id, i) => (
                  <div key={i} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl border border-white/5 transition-transform hover:rotate-12">
                    {GUILD_SHOP.find(s => s.id === id)?.icon}
                  </div>
                ))}
                {player.inventory.length === 0 && <p className="text-xs text-white/30 italic py-2">乾坤袋空空如也...</p>}
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="fixed right-6 bottom-24 flex flex-col items-center gap-2 z-50">
        <span className="text-[8px] font-black text-amber-500 bg-white px-2 py-0.5 rounded-full border shadow-sm uppercase tracking-tighter">师傅核验</span>
        <button 
          onClick={() => setShowScanner(true)}
          className="w-14 h-14 bg-amber-400 rounded-full shadow-2xl flex items-center justify-center text-white active:scale-90 transition-transform"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
        </button>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t h-20 flex items-center justify-around z-40 px-4 shadow-lg">
        {[
          { id: 'map', label: '识梦', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
          { id: 'quests', label: '心愿', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
          { id: 'shop', label: '阁楼', icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
          { id: 'profile', label: '手记', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1 transition-all flex-1 ${activeTab === tab.id ? 'text-rose-500 scale-105' : 'text-slate-300'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} /></svg>
            <span className="text-[10px] font-bold tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {pendingQuest && (
          <QRModal 
            quest={pendingQuest} 
            onCancel={() => setPendingQuest(null)} 
            onSimulateVerify={() => finalizeQuest(pendingQuest)}
          />
        )}
        {showScanner && (
          <ScannerOverlay 
            onScan={handleScanSuccess} 
            onClose={() => setShowScanner(false)} 
          />
        )}
        {showAscendModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-8 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl w-full max-w-sm p-10 shadow-2xl space-y-8 border-4 border-rose-100">
              <div className="text-center">
                <div className="text-6xl mb-6 transform transition-transform hover:scale-110">🪬</div>
                <h2 className="text-3xl font-black text-slate-800">织梦晋升</h2>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-[0.3em] font-bold">Dream Ascension</p>
              </div>
              <div className="bg-[#fefaf6] p-6 rounded-2xl text-sm leading-relaxed text-slate-800 border border-amber-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest">掌门核验课题</p>
                <p className="font-serif italic text-xl leading-snug">“{currentLevelData.exam}”</p>
              </div>
              <div className="space-y-4 pt-4">
                <button 
                  onClick={handleAscend}
                  className="w-full py-5 bg-slate-800 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl active:translate-y-1 transition-all"
                >
                  已达成 · 开启新篇章
                </button>
                <button 
                  onClick={() => setShowAscendModal(false)}
                  className="w-full py-4 text-slate-400 text-xs font-bold uppercase tracking-widest"
                >
                  修行尚浅，暂缓
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
