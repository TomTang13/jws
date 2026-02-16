import React, { useState, useEffect, useCallback } from 'react';
import { LEVELS, QUESTS, SKILL_PATHS, GUILD_SHOP } from './constants';
import { PlayerStats, Realm, Quest } from './types';
import { QuestCard } from '../components/QuestCard';
import { LandingPage } from '../components/LandingPage';
import { WaitingPage } from '../components/WaitingPage';
import { QRModal } from '../components/QRModal';
import { ScannerOverlay } from '../components/ScannerOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, testConnection } from './supabase';
import { signUp, signIn, signInWithPasswordOnly, signOut, syncKeyPassword, onAuthChange, getCurrentUser, updateProfile, getTokenBasedPassword, type UserProfile } from './auth';
import { getLevels, getQuests, getShopItems, getUserCompletedQuests, getUserInventory, addQuestRecord, addRedemptionRecord } from './dataService';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [levels, setLevels] = useState(LEVELS);
  const [quests, setQuests] = useState(QUESTS);
  const [shopItems, setShopItems] = useState(GUILD_SHOP);
  
  const [activeTab, setActiveTab] = useState<'map' | 'quests' | 'shop' | 'profile'>('map');
  const [questSubTab, setQuestSubTab] = useState<'daily' | 'labor' | 'patron'>('daily');
  const [showAscendModal, setShowAscendModal] = useState(false);
  
  const [pendingQuest, setPendingQuest] = useState<Quest | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [userInventory, setUserInventory] = useState<string[]>([]);

  // 初始化
  useEffect(() => {
    // 从 sessionStorage 获取邀请码
    const token = sessionStorage.getItem('jws_invite_token');
    if (token) {
      setInviteToken(token);
    }
    
    async function init() {
      // 测试 Supabase 连接
      const connected = await testConnection();
      setIsConnected(connected);
      
      if (connected) {
        // 加载数据
        await loadData();
        
        // 监听登录状态
        onAuthChange(async (profile) => {
          setUser(profile);
          if (profile) {
            await loadUserData(profile.id);
          }
        });
      }
      
      setIsLoading(false);
    }
    
    init();
  }, []);

  async function loadData() {
    try {
      // 加载等级
      const levelData = await getLevels();
      if (levelData.length > 0) setLevels(levelData);
      
      // 加载任务
      const questData = await getQuests('daily');
      if (questData.length > 0) setQuests(questData);
      
      // 加载商店
      const shopData = await getShopItems();
      if (shopData.length > 0) setShopItems(shopData);
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  }

  async function loadUserData(userId: string) {
    const [completed, inventory] = await Promise.all([
      getUserCompletedQuests(userId),
      getUserInventory(userId)
    ]);
    setCompletedQuests(completed);
    setUserInventory(inventory);
  }

  // 首次使用密钥 t：仅填昵称，用密钥派生密码注册并登录
  const handleLogin = async (nickname: string, preUserId: string) => {
    setIsLoading(true);
    try {
      const password = getTokenBasedPassword(preUserId);
      const result = await signUp(nickname, password, preUserId);
      if (result.error) {
        alert(result.error.message);
        return false;
      }
      // 注册成功后，手动获取用户档案并更新 user 状态
      const userProfile = await getCurrentUser();
      if (userProfile) {
        setUser(userProfile);
        await loadUserData(userProfile.id);
      }
      sessionStorage.removeItem('jws_invite_token');
      setInviteToken(null);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  // 已使用过密钥 t：仅凭 t 即可登录（服务端同步派生密码后直接登入，用户无需输入密码）。
  const handleAutoLogin = async (preUserId: string, rawToken: string): Promise<{ ok: boolean; error?: string }> => {
    console.log('[handleAutoLogin] 开始自动登录流程:', { preUserId, rawToken });
    try {
      // 检查 pre_users 表中是否有对应的记录
      console.log('[handleAutoLogin] 查询 pre_users 表...');
      const { data: preRow, error: preRowError } = await supabase
        .from('pre_users')
        .select('used_by')
        .eq('id', preUserId)
        .single();
      
      console.log('[handleAutoLogin] pre_users 查询结果:', { preRow, preRowError });
      
      if (preRowError) {
        console.error('[handleAutoLogin] pre_users 查询失败:', preRowError);
        return { ok: false, error: `pre_users 查询失败: ${preRowError.message}` };
      }
      
      if (!preRow?.used_by) {
        console.error('[handleAutoLogin] used_by 未填写:', preRow);
        return { ok: false, error: 'pre_users.used_by 未填写。请把该密钥对应的用户 id（profiles 表的 id）填入该行的 used_by 列。' };
      }
      
      // 检查 profiles 表中是否有对应的用户
      console.log('[handleAutoLogin] 查询 profiles 表...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', preRow.used_by)
        .single();
      
      console.log('[handleAutoLogin] profiles 查询结果:', { profile, profileError });
      
      if (profileError) {
        console.error('[handleAutoLogin] profiles 查询失败:', profileError);
        return { ok: false, error: `profiles 查询失败: ${profileError.message}` };
      }
      
      if (!profile) {
        console.error('[handleAutoLogin] 未找到关联账号:', preRow.used_by);
        return { ok: false, error: '未找到关联账号：profiles 中不存在 id = ' + preRow.used_by + '，请检查 used_by 是否填错。' };
      }
      
      // 先让服务端把该用户的 Auth 邮箱+密码同步，再登录，保证仅凭 t 即可进入
      console.log('[handleAutoLogin] 开始密钥同步...');
      const syncRes = await syncKeyPassword(preUserId, rawToken);
      console.log('[handleAutoLogin] 密钥同步结果:', syncRes);
      
      if (!syncRes.ok) {
        console.error('[handleAutoLogin] 密钥同步失败:', syncRes.error);
        // 生成详细的错误信息，包含所有可能的调试信息
        const detailedError = `
密钥同步失败详情：
- Edge Function 错误: ${syncRes.error || '未知错误'}
- 密钥: ${rawToken}
- 预注册用户ID: ${preUserId}
- 请检查：
  1. Edge Function 是否已部署
  2. 环境变量是否正确配置
  3. pre_users 表中是否存在该密钥
  4. 数据库权限是否正确
`;
        console.error('[handleAutoLogin] 详细错误信息:', detailedError);
        return { ok: false, error: detailedError };
      }
      
      // 同步成功后，使用派生密码登录
      console.log('[handleAutoLogin] 密钥同步成功，开始登录...');
      const password = getTokenBasedPassword(preUserId);
      console.log('[handleAutoLogin] 登录参数:', { nickname: profile.nickname, password });
      
      const result = await signInWithPasswordOnly(profile.nickname, password);
      console.log('[handleAutoLogin] 登录结果:', result);
      
      if (result.error) {
        console.error('[handleAutoLogin] 登录失败:', result.error);
        return {
          ok: false,
          error: '凭密钥即可进入；若仍失败请部署 Edge Function sync-key-password 后重试。' +
            (result.error.message ? ' 详情：' + result.error.message : ''),
        };
      }
      
      // 登录成功
      console.log('[handleAutoLogin] 登录成功，加载用户数据...');
      sessionStorage.removeItem('jws_invite_token');
      setInviteToken(null);
      setUser(profile);
      await loadUserData(profile.id);
      console.log('[handleAutoLogin] 自动登录流程完成');
      return { ok: true };
    } catch (e: any) {
      console.error('[handleAutoLogin] 自动登录异常:', { message: e.message, stack: e.stack });
      return { ok: false, error: `自动登录异常: ${e.message}` };
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  const currentLevelData = levels[user?.level ? user.level - 1 : 0] || levels[0];
  const canAscend = user ? (user.inspiration || 0) >= currentLevelData.inspirationRequired : false;

  const handleAscend = async () => {
    if (!user || !canAscend) return;
    
    const { error } = await updateProfile({ level: user.level + 1 });
    if (!error) {
      setUser(prev => prev ? { ...prev, level: prev.level + 1 } : null);
      setShowAscendModal(false);
    }
  };

  const handleQuestAction = async (questId: string) => {
    if (!user) {
      alert('请先登录');
      return;
    }
    
    const quest = quests.find(q => q.id === questId);
    if (!quest) return;
    
    if (quest.cost && (user.coins || 0) < quest.cost) {
      alert('灵石不足');
      return;
    }
    
    setPendingQuest(quest);
  };

  const finalizeQuest = async (questToComplete: Quest) => {
    if (!user) return;
    
    // 更新本地状态
    setCompletedQuests(prev => [...prev, questToComplete.id]);
    
    // 更新数据库
    await addQuestRecord(user.id, questToComplete.id);
    await updateProfile({
      coins: (user.coins || 0) - (questToComplete.cost || 0),
      yc: (user.yc || 0) + questToComplete.ycReward,
      inspiration: (user.inspiration || 0) + questToComplete.insReward
    });
    
    // 更新本地用户状态
    setUser(prev => prev ? ({
      ...prev,
      coins: prev.coins - (questToComplete.cost || 0),
      yc: prev.yc + questToComplete.ycReward,
      inspiration: prev.inspiration + questToComplete.insReward
    }) : null);
    
    setPendingQuest(null);
    alert(`核验成功！心愿「${questToComplete.title}」已圆满达成。`);
  };

  const handleScanSuccess = async (data: string) => {
    setShowScanner(false);
    
    if (!user) {
      alert('请先登录');
      return;
    }
    
    if (pendingQuest) {
      await finalizeQuest(pendingQuest);
    } else {
      // 签到奖励
      alert('秘钥识别成功：工坊签到完成！获得 10 织梦币 (YC)');
      await updateProfile({ yc: user.yc + 10 });
      setUser(prev => prev ? { ...prev, yc: prev.yc + 10 } : null);
    }
  };

  const handleBuyItem = async (itemId: string, cost: number) => {
    if (!user) {
      alert('请先登录');
      return;
    }
    
    if (user.yc < cost) {
      alert('织梦币(YC)不足，多去完成心愿吧。');
      return;
    }
    
    // 更新本地状态
    setUserInventory(prev => [...prev, itemId]);
    
    // 更新数据库
    await addRedemptionRecord(user.id, itemId, cost);
    await updateProfile({ yc: user.yc - cost });
    
    setUser(prev => prev ? { ...prev, yc: prev.yc - cost } : null);
    alert('兑换成功，凭证已入乾坤袋。');
  };

  const getRealmStyles = (realm: string) => {
    if (realm.includes('萌芽')) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    if (realm.includes('花期')) return 'text-rose-700 bg-rose-50 border-rose-100';
    return 'text-amber-700 bg-amber-50 border-amber-100';
  };

  // 显示等待页面（没有邀请码）
  if (!isLoading && !user && !inviteToken) {
    return (
      <WaitingPage 
        onRefresh={() => {
          const token = sessionStorage.getItem('jws_invite_token');
          if (token) {
            setInviteToken(token);
          }
        }}
      />
    );
  }

  // 显示登录页面（未登录但有邀请码）
  if (!isLoading && !user) {
    return (
      <LandingPage 
        onLogin={handleLogin}
        onAutoLogin={handleAutoLogin}
        isLoading={isLoading}
        token={inviteToken || undefined}
      />
    );
  }

  // 加载中
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-[#fcfaf7] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🧶</div>
          <p className="text-slate-600 font-serif">正在连接织梦手记...</p>
          {!isConnected && <p className="text-xs text-amber-500 mt-2">演示模式</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24 bg-[#fcfaf7] relative shadow-2xl flex flex-col font-serif paper-texture">
      <header className="p-6 bg-white border-b sticky top-0 z-40 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter">织梦手记</h1>
            <p className="text-[9px] uppercase tracking-widest text-amber-500 font-bold">
              {user?.nickname || '访客'} 的工坊 · {user?.level || 1} 境
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-100 shadow-sm">
              YC: {user?.yc || 0}
            </div>
            <div className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[10px] font-bold border border-slate-100">
              灵石: {user?.coins || 0}
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">灵感值</span>
            <span className="text-[10px] font-bold text-slate-800">{user?.inspiration || 0} / {currentLevelData.inspirationRequired}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 via-rose-300 to-amber-400 transition-all duration-1000"
              style={{ width: `${Math.min(((user?.inspiration || 0) / currentLevelData.inspirationRequired) * 100, 100)}%` }}
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
                    {user?.level || 1}
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
                  <p className="text-sm font-medium leading-relaxed text-slate-700">"{currentLevelData.exam}"</p>
                </div>
                <button 
                  onClick={() => setShowAscendModal(true)}
                  disabled={!canAscend}
                  className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all transform active:scale-95 shadow-md ${
                    canAscend ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-50 text-slate-300 border'
                  }`}
                >
                  {canAscend ? '灵感充沛 · 请求晋升' : `还需 ${currentLevelData.inspirationRequired - (user?.inspiration || 0)} 灵感`}
                </button>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scroll-hide px-1">
              {SKILL_PATHS.map(path => (
                <div key={path.id} className={`min-w-[150px] p-5 rounded-2xl border text-center transition-all bg-white shadow-sm ${
                  user?.skill_path === path.id ? 'border-rose-400 bg-rose-50/30' : 'border-slate-100'
                } ${(user?.level || 0) < 3 ? 'opacity-30 grayscale' : ''}`}>
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
              {quests.filter(q => q.type === questSubTab).map(quest => (
                <QuestCard 
                  key={quest.id} 
                  quest={quest} 
                  playerLevel={user?.level || 1}
                  isCompleted={completedQuests.includes(quest.id)}
                  isPending={pendingQuest?.id === quest.id}
                  canAfford={!quest.cost || (user?.coins || 0) >= (quest.cost || 0)}
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
              {shopItems.map(item => (
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
              <button 
                onClick={handleLogout}
                className="absolute top-4 right-4 text-xs text-slate-400 hover:text-slate-600"
              >
                退出登录
              </button>
              <div className="w-24 h-24 mx-auto mb-5 rounded-full border-4 border-rose-100 overflow-hidden bg-slate-50 p-1">
                 <img className="w-full h-full rounded-full" src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.nickname || 'default'}`} alt="Avatar" />
              </div>
              <h2 className="text-xl font-black text-slate-800">{user?.nickname}</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">第 {user?.level || 1} 境 织梦人</p>
              <p className="text-[10px] mt-2 text-rose-500 font-bold uppercase tracking-widest">{user?.play_style || 'Hybrid'} 流派修行中</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border text-center shadow-sm">
                <span className="text-[10px] block font-bold text-slate-300 uppercase mb-1">织梦币 (YC)</span>
                <span className="text-xl font-black text-amber-600">{user?.yc || 0}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border text-center shadow-sm">
                <span className="text-[10px] block font-bold text-slate-300 uppercase mb-1">已成心愿</span>
                <span className="text-xl font-black text-slate-800">{completedQuests.length}</span>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-2xl text-white shadow-xl">
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-rose-300">乾坤袋</h3>
              <div className="flex flex-wrap gap-3">
                {userInventory.map((itemId, i) => {
                  const item = shopItems.find(s => s.id === itemId);
                  return (
                    <div key={i} className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl border border-white/5 transition-transform hover:rotate-12">
                      {item?.icon || '📦'}
                    </div>
                  );
                })}
                {userInventory.length === 0 && <p className="text-xs text-white/30 italic py-2">乾坤袋空空如也...</p>}
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
                <p className="font-serif italic text-xl leading-snug">"{currentLevelData.exam}"</p>
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
