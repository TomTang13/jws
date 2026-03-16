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
import { signUp, signIn, signInWithPasswordOnly, signOut, syncKeyPassword, onAuthChange, getCurrentUser, updateProfile, getTokenBasedPassword, type UserProfile, checkAndUpdateLoginCount, recordLoginHistory } from './auth';
import { getLevels, getQuests, getShopItems, getUserCompletedQuests, getUserInventory, addQuestRecord, addRedemptionRecord, generateQuestQRCode, verifyQuestQRCode, expireQuestQRCode, cancelQuestQRCode, updateQuestQRCodeStatus, isQuestCompleted, getUserData, generateLevelQRCode, verifyLevelQRCode, completeLevelPromotion, checkLevelPromotionStatus } from './dataService';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [levels, setLevels] = useState(LEVELS);
  const [quests, setQuests] = useState(QUESTS);
  const [shopItems, setShopItems] = useState(GUILD_SHOP);
  const [dailyLoginCount, setDailyLoginCount] = useState<number>(1);
  const [dailyLoginLimit, setDailyLoginLimit] = useState<number>(5);

  const [activeTab, setActiveTab] = useState<'map' | 'quests' | 'shop' | 'profile'>('map');
  const [questSubTab, setQuestSubTab] = useState<'daily' | 'labor' | 'patron'>('daily');
  const [showAscendModal, setShowAscendModal] = useState(false);

  const [pendingQuest, setPendingQuest] = useState<Quest | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [completedQuests, setCompletedQuests] = useState<string[]>([]);
  const [userInventory, setUserInventory] = useState<string[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrCodeContent, setQrCodeContent] = useState<string>('');
  const [qrCodeId, setQrCodeId] = useState<string>('');
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [scannedQRCodeContent, setScannedQRCodeContent] = useState<string>('');
  const [scannedQuestId, setScannedQuestId] = useState<string>('');
  const [scannedUserId, setScannedUserId] = useState<string>('');
  const [scannedQRCodeId, setScannedQRCodeId] = useState<string>('');

  // 等级提升相关状态
  const [showLevelQRModal, setShowLevelQRModal] = useState(false);
  const [levelQRCodeUrl, setLevelQRCodeUrl] = useState<string>('');
  const [levelQRCodeContent, setLevelQRCodeContent] = useState<string>('');
  const [levelQRCodeId, setLevelQRCodeId] = useState<string>('');
  const [targetLevel, setTargetLevel] = useState<number>(1);
  const [scannedLevelData, setScannedLevelData] = useState<{ userId: string; currentLevel: number; targetLevel: number; qrCodeId: string }>({ userId: '', currentLevel: 0, targetLevel: 0, qrCodeId: '' });
  const [showLevelVerifyConfirm, setShowLevelVerifyConfirm] = useState(false);

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
        // 加载数据，拿到真实的 DB quests（含 UUID）
        const loadedQuests = await loadData();

        // 监听登录状态，把 loadedQuests 直接传入，避免用闭包里的旧常量
        onAuthChange(async (profile) => {
          setUser(profile);
          if (profile) {
            await loadUserData(profile.id, loadedQuests);
          }
        });
      }

      setIsLoading(false);
    }

    init();
  }, []);

  // 检查等级提升状态
  useEffect(() => {
    if (showLevelQRModal && user && levelQRCodeId) {
      const checkInterval = setInterval(async () => {
        try {
          console.log('检查等级提升状态...');
          console.log('使用二维码ID检查:', levelQRCodeId);
          const isPromoted = await checkLevelPromotionStatus(levelQRCodeId);
          console.log('等级提升状态检查结果:', isPromoted);

          if (isPromoted) {
            // 清除检查间隔，避免重复检查
            clearInterval(checkInterval);

            // 等级提升已验证，重新加载用户数据
            console.log('等级提升已验证，重新加载用户数据...');
            const { data: updatedUser, error: userError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (userError) {
              console.error('获取更新后的用户数据失败:', userError);
              return;
            }

            if (updatedUser) {
              console.log('获取更新后的用户数据成功:', {
                level: updatedUser.level,
                current_level: updatedUser.current_level,
                promotion_pending: updatedUser.promotion_pending
              });

              // 检查等级是否真的提升了
              if (updatedUser.level > user.level) {
                // 更新用户状态
                setUser(updatedUser);

                // 关闭等级提升二维码模态框
                setShowLevelQRModal(false);
                setLevelQRCodeUrl('');
                setLevelQRCodeContent('');
                setLevelQRCodeId('');
                setTargetLevel(1);

                // 显示等级提升成功提示
                alert(`等级提升成功！您现在是第 ${updatedUser.level} 境织梦人`);

                console.log('等级提升流程完成，UI 已跳转回主界面');
              } else {
                console.warn('等级提升状态检查返回true，但用户等级没有提升:', {
                  currentLevel: updatedUser.level,
                  previousLevel: user.level
                });
              }
            }
          }
        } catch (error) {
          console.error('检查等级提升状态失败:', error);
        }
      }, 2000); // 缩短检查间隔，提高响应速度

      return () => clearInterval(checkInterval);
    }
  }, [showLevelQRModal, user, levelQRCodeId]);

  async function loadData(): Promise<Quest[]> {
    try {
      // 加载等级
      const levelData = await getLevels();
      if (levelData.length > 0) setLevels(levelData);

      // 加载所有类型的任务
      const [dailyQuests, laborQuests, patronQuests] = await Promise.all([
        getQuests('daily'),
        getQuests('labor'),
        getQuests('patron')
      ]);

      // 合并所有任务
      const allQuests = [...dailyQuests, ...laborQuests, ...patronQuests];
      if (allQuests.length > 0) setQuests(allQuests);

      // 加载商店
      const shopData = await getShopItems();
      if (shopData.length > 0) setShopItems(shopData);

      // 返回真实的 DB quests，供 loadUserData 直接使用（避免 React 状态异步问题）
      return allQuests;
    } catch (err) {
      console.error('加载数据失败:', err);
      return [];
    }
  }

  async function loadUserData(userId: string, questList?: Quest[]) {
    const [inventory, userData] = await Promise.all([
      getUserInventory(userId),
      getUserData(userId)
    ]);

    // 优先用传入的 questList（含真实 UUID），兜底才用 state 里的 quests
    const questsToCheck = (questList && questList.length > 0) ? questList : quests;

    // 对于每个任务，检查其完成状态（只处理有效 UUID 的任务）
    const completedQuests = [];
    for (const quest of questsToCheck) {
      // 跳过明显不是 UUID 的 ID（如本地常量 d1/d2/l1 等），避免数据库报错
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(quest.id)) continue;

      const isCompleted = await isQuestCompleted(userId, quest.id, quest.type);
      if (isCompleted) {
        completedQuests.push(quest.id);
      }
    }

    setCompletedQuests(completedQuests);
    setUserInventory(inventory);
    // 更新用户基本信息，包括织梦币和灵感值
    if (userData) {
      setUser(userData);
    }
  }

  // 首次使用密钥 t：仅填昵称，用密钥派生密码注册并登录
  const handleLogin = async (nickname: string, preUserId: string) => {
    setIsLoading(true);
    try {
      // 检查登录次数限制
      console.log('[handleLogin] 检查登录次数限制...');
      const loginCheckResult = await checkAndUpdateLoginCount(preUserId);
      console.log('[handleLogin] 登录次数检查结果:', loginCheckResult);

      if (!loginCheckResult.success) {
        console.error('[handleLogin] 登录次数检查失败:', loginCheckResult.error || loginCheckResult.message);
        if (loginCheckResult.message === '工坊能量耗尽') {
          // 登录次数超限，显示错误
          alert('工坊能量耗尽，今日进入工坊的次数已达上限');
        } else {
          alert(loginCheckResult.error || '登录检查失败');
        }
        return false;
      }

      // 更新登录次数状态
      setDailyLoginCount(loginCheckResult.dailyLoginCount || 1);
      setDailyLoginLimit(loginCheckResult.dailyLoginLimit || 5);

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

        // 记录登录历史
        console.log('[handleLogin] 登录成功，记录登录历史...');
        await recordLoginHistory(userProfile.id, preUserId, 'success');
      }
      sessionStorage.removeItem('jws_invite_token');
      setInviteToken(null);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  // 已使用过密钥 t：仅凭 t 即可登录（服务端同步派生密码后直接登入，用户无需输入密码）。
  const handleAutoLogin = async (preUserId: string, rawToken: string): Promise<{ ok: boolean; error?: string; dailyLoginCount?: number; dailyLoginLimit?: number }> => {
    console.log('[handleAutoLogin] 开始自动登录流程:', { preUserId, rawToken });
    try {
      // 检查登录次数限制
      console.log('[handleAutoLogin] 检查登录次数限制...');
      const loginCheckResult = await checkAndUpdateLoginCount(preUserId);
      console.log('[handleAutoLogin] 登录次数检查结果:', loginCheckResult);

      if (!loginCheckResult.success) {
        console.error('[handleAutoLogin] 登录次数检查失败:', loginCheckResult.error || loginCheckResult.message);
        return {
          ok: false,
          error: loginCheckResult.message || loginCheckResult.error || '登录检查失败',
          dailyLoginCount: loginCheckResult.dailyLoginCount,
          dailyLoginLimit: loginCheckResult.dailyLoginLimit
        };
      }

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

      // 登录成功，记录登录历史
      console.log('[handleAutoLogin] 登录成功，记录登录历史...');
      await recordLoginHistory(preRow.used_by, preUserId, 'success');

      // 登录成功
      console.log('[handleAutoLogin] 登录成功，加载用户数据...');
      sessionStorage.removeItem('jws_invite_token');
      setInviteToken(null);
      setUser(profile);
      // 更新登录次数状态
      setDailyLoginCount(loginCheckResult.dailyLoginCount || 1);
      setDailyLoginLimit(loginCheckResult.dailyLoginLimit || 5);
      await loadUserData(profile.id);
      console.log('[handleAutoLogin] 自动登录流程完成');
      return {
        ok: true,
        dailyLoginCount: loginCheckResult.dailyLoginCount,
        dailyLoginLimit: loginCheckResult.dailyLoginLimit
      };
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
    if (!user || !canAscend || user.promotion_pending) return;

    try {
      // 生成等级提升二维码
      const targetLevelValue = user.level + 1;
      const { qrCodeUrl, qrCodeContent, qrCodeId } = await generateLevelQRCode(user.id, user.level, targetLevelValue);

      // 直接显示等级提升二维码模态框，跳过中间的晋升UI
      setLevelQRCodeUrl(qrCodeUrl);
      setLevelQRCodeContent(qrCodeContent);
      setLevelQRCodeId(qrCodeId);
      setTargetLevel(targetLevelValue);
      setShowLevelQRModal(true);
    } catch (error) {
      console.error('申请等级提升失败:', error);
      alert('申请等级提升失败，请重试');
    }
  };

  // 处理等级提升二维码取消
  const handleLevelQRCancel = async () => {
    if (levelQRCodeId) {
      // 这里可以添加取消等级提升二维码的逻辑
      console.log('取消等级提升二维码:', levelQRCodeId);
    }

    // 更新用户状态
    if (user) {
      await supabase
        .from('profiles')
        .update({ promotion_pending: false })
        .eq('id', user.id);
    }

    setShowLevelQRModal(false);
    setLevelQRCodeUrl('');
    setLevelQRCodeContent('');
    setLevelQRCodeId('');
    setTargetLevel(1);
  };

  // 处理等级提升验证确认
  const handleLevelVerifyConfirm = async (confirm: boolean) => {
    setShowLevelVerifyConfirm(false);

    if (!confirm || !user || !scannedLevelData.userId) {
      return;
    }

    try {
      const { userId, currentLevel, targetLevel, qrCodeId } = scannedLevelData;

      // 完成等级提升验证
      const result = await completeLevelPromotion(qrCodeId, userId, user.id, currentLevel, targetLevel);
      if (result.ok) {
        alert(`等级提升验证成功！用户已晋升为第 ${targetLevel} 境织梦人`);
      } else {
        alert(`等级提升验证失败: ${result.error}`);
      }
    } catch (error) {
      console.error('完成等级提升验证失败:', error);
      alert('完成等级提升验证失败，请重试');
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
      alert('织梦币不足');
      return;
    }

    // 检查任务是否需要师傅验证
    // 这里假设quest对象包含needs_verification属性
    // 如果没有该属性，默认需要验证
    const needsVerification = quest.needs_verification !== false;

    if (needsVerification) {
      // 需要师傅验证，生成任务二维码
      try {
        const { qrCodeUrl, qrCodeContent, qrCodeId } = await generateQuestQRCode(questId, user.id);
        setQrCodeUrl(qrCodeUrl);
        setQrCodeContent(qrCodeContent);
        setQrCodeId(qrCodeId);
      } catch (error) {
        console.error('生成二维码失败:', error);
        // 如果生成二维码失败，使用默认值
        setQrCodeUrl('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=jws:quest:error');
        setQrCodeContent('jws:quest:error');
        setQrCodeId('');
      }

      setPendingQuest(quest);
    } else {
      // 不需要师傅验证，直接完成任务
      await finalizeQuest(quest);
    }
  };

  const finalizeQuest = async (questToComplete: Quest) => {
    if (!user) return;

    // 更新本地状态
    setCompletedQuests(prev => [...prev, questToComplete.id]);

    // 更新数据库
    await addQuestRecord(user.id, questToComplete.id, qrCodeId, questToComplete.type);
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

    // 检查是否是师傅
    if (user.is_master) {
      // 检查二维码类型
      const isLevelQRCode = data.startsWith('jws:level:');

      if (isLevelQRCode) {
        // 师傅扫描等级提升二维码
        try {
          const verifyResult = await verifyLevelQRCode(data);
          if (verifyResult.ok) {
            // 保存扫描结果
            setScannedLevelData({
              userId: verifyResult.userId || '',
              currentLevel: verifyResult.currentLevel || 0,
              targetLevel: verifyResult.targetLevel || 0,
              qrCodeId: verifyResult.qrCodeId || ''
            });
            // 弹出二次确认框
            setShowLevelVerifyConfirm(true);
          } else {
            alert(`等级提升二维码验证失败: ${verifyResult.error}`);
          }
        } catch (error) {
          console.error('验证等级提升二维码失败:', error);
          alert('验证等级提升二维码失败，请重试');
        }
      } else {
        // 师傅扫描任务二维码，验证任务
        try {
          const verifyResult = await verifyQuestQRCode(data);
          if (verifyResult.ok) {
            // 保存扫描结果
            setScannedQRCodeContent(data);
            setScannedQuestId(verifyResult.questId || '');
            setScannedUserId(verifyResult.userId || '');
            setScannedQRCodeId(verifyResult.qrCodeId || '');
            // 弹出二次确认框
            setShowVerifyConfirm(true);
          } else {
            alert(`二维码验证失败: ${verifyResult.error}`);
          }
        } catch (error) {
          console.error('验证二维码失败:', error);
          alert('验证二维码失败，请重试');
        }
      }
    } else if (pendingQuest) {
      // 普通用户完成任务
      await finalizeQuest(pendingQuest);
    } else {
      // 签到奖励
      alert('秘钥识别成功：工坊签到完成！获得 10 织梦币');
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
      alert('织梦币不足，多去完成心愿吧。');
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

  // 处理师傅核验确认
  const handleVerifyConfirm = async (confirm: boolean) => {
    setShowVerifyConfirm(false);

    if (!confirm || !user || !scannedQuestId || !scannedUserId || !scannedQRCodeId) {
      return;
    }

    try {
      // 获取任务信息
      const quest = quests.find(q => q.id === scannedQuestId);
      if (!quest) {
        alert('任务不存在');
        return;
      }

      // 检查任务是否已完成
      const isCompleted = await isQuestCompleted(scannedUserId, scannedQuestId, quest.type);
      if (isCompleted) {
        alert('任务已经完成，无需重复核验');
        return;
      }

      // 更新二维码状态
      const updateStatusResult = await updateQuestQRCodeStatus(scannedQRCodeId);
      if (updateStatusResult.error) {
        console.error('更新二维码状态失败:', updateStatusResult.error);
        alert('更新二维码状态失败，请重试');
        return;
      }

      // 添加任务完成记录
      // 从quests数组中查找任务类型
      const questType = quest?.type || 'daily';
      const addQuestResult = await addQuestRecord(scannedUserId, scannedQuestId, scannedQRCodeId, questType);
      if (addQuestResult.error) {
        console.error('添加任务记录失败:', addQuestResult.error);
        alert('添加任务记录失败，请重试');
        return;
      }

      // 更新用户数据（使用存储过程发放奖励）
      const { error: updateUserError } = await supabase
        .rpc('update_user_reward', {
          p_user_id: scannedUserId,
          p_cost_coins: quest.cost || 0,
          p_yc_reward: quest.ycReward,
          p_inspiration_reward: quest.insReward
        });

      if (updateUserError) {
        console.error('更新用户数据失败:', updateUserError);
        alert('更新用户数据失败，请重试');
        return;
      }

      alert('核验成功！任务已完成。');
    } catch (error) {
      console.error('核验确认失败:', error);
      alert('核验确认失败，请重试');
    }
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
          {!isConnected && <p className="text-xs text-amber-500 mt-2">庭院打扫中</p>}
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
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">
              这是您今天 {dailyLoginCount}/{dailyLoginLimit} 次进入织梦手记
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-100 shadow-sm">
              织梦币: {user?.yc || 0}
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
                  onClick={handleAscend}
                  disabled={!canAscend}
                  className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all transform active:scale-95 shadow-md ${canAscend ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-slate-50 text-slate-300 border'
                    }`}
                >
                  {canAscend ? '创意满溢 · 开启新篇章' : `还需 ${currentLevelData.inspirationRequired - (user?.inspiration || 0)} 创意`}
                </button>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scroll-hide px-1">
              {SKILL_PATHS.map(path => (
                <div key={path.id} className={`min-w-[150px] p-5 rounded-2xl border text-center transition-all bg-white shadow-sm ${user?.skill_path === path.id ? 'border-rose-400 bg-rose-50/30' : 'border-slate-100'
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
                  className={`flex-1 py-2.5 text-[10px] font-bold rounded-lg transition-all ${questSubTab === tab.id ? 'bg-white shadow-sm ' + tab.color : 'text-slate-400'
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
                    {item.cost} 织梦币
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
                <span className="text-[10px] block font-bold text-slate-300 uppercase mb-1">灵感值</span>
                <span className="text-xl font-black text-emerald-600">{user?.inspiration || 0}</span>
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
        {pendingQuest && user && (
          <QRModal
            key="qr-modal"
            quest={pendingQuest}
            qrCodeUrl={qrCodeUrl}
            qrCodeContent={qrCodeContent}
            qrCodeId={qrCodeId}
            onCancel={() => {
              // Cancel the QR code in the database
              if (qrCodeId) {
                cancelQuestQRCode(qrCodeId).then(result => {
                  if (!result.ok) {
                    console.error('取消二维码失败:', result.error);
                  }
                });
              }
              setPendingQuest(null);
            }}
            onSimulateVerify={() => finalizeQuest(pendingQuest)}
            onQuestCompleted={() => {
              // 重新加载用户数据，实现无刷更新
              if (user) {
                loadUserData(user.id).then(() => {
                  console.log('用户数据更新成功');
                });
              }
            }}
            userId={user.id}
          />
        )}
        {showScanner && (
          <ScannerOverlay
            key="scanner"
            onScan={handleScanSuccess}
            onClose={() => setShowScanner(false)}
          />
        )}

        {/* 等级提升二维码模态框 */}
        {showLevelQRModal && (
          <motion.div
            key="level-qr-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/90 flex items-center justify-center p-8 backdrop-blur-md"
          >
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
                  <h3 className="text-xl font-black text-slate-800 italic">等级提升验证</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Level Promotion</p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-3xl border-2 border-dashed border-slate-200 w-full z-10">
                <p className="text-[10px] font-black text-slate-300 uppercase mb-2">提升信息</p>
                <p className="text-sm font-bold text-slate-700">当前等级: {user?.level || 1} → 目标等级: {targetLevel}</p>
              </div>

              {/* Level QR Code */}
              <div className="p-4 bg-white border-4 border-slate-100 rounded-3xl shadow-inner relative group z-10 flex items-center justify-center">
                <img
                  src={levelQRCodeUrl}
                  alt="等级提升验证二维码"
                  className="w-48 h-48 object-contain"
                />
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="text-4xl">✨</span>
                </motion.div>
              </div>

              <div className="space-y-3 z-10">
                <p className="text-[10px] text-slate-400 font-serif italic">请展示给师傅核验</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">等待师傅验收...</span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2 pt-2 z-10">
                <button
                  onClick={handleLevelQRCancel}
                  className="w-full py-3 border border-slate-200 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  取消提升 (返回)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 等级提升验证确认模态框 */}
        {showLevelVerifyConfirm && (
          <motion.div
            key="level-verify-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/90 flex items-center justify-center p-8 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-2xl space-y-6 relative overflow-hidden"
            >
              <div className="space-y-3 z-10">
                <div className="text-4xl mb-2">⚡</div>
                <h3 className="text-xl font-black text-slate-800">等级提升验证</h3>
                <p className="text-sm text-slate-600">确认为该用户提升等级吗？</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 w-full text-left">
                  <p className="text-sm font-bold">当前等级: {scannedLevelData.currentLevel}</p>
                  <p className="text-sm font-bold">目标等级: {scannedLevelData.targetLevel}</p>
                </div>
              </div>

              <div className="w-full flex flex-col gap-3 pt-2 z-10">
                <button
                  onClick={() => handleLevelVerifyConfirm(true)}
                  className="w-full py-3 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  确认提升
                </button>
                <button
                  onClick={() => handleLevelVerifyConfirm(false)}
                  className="w-full py-3 border border-slate-200 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {user?.is_master && (
          <motion.div
            key="master-button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 z-40"
          >
            <button
              onClick={() => setShowScanner(true)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 active:scale-95 transition-all"
            >
              <span className="text-lg">📱</span>
              <span className="font-bold">师傅核验</span>
            </button>
          </motion.div>
        )}
        {showVerifyConfirm && (
          <motion.div
            key="verify-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-8 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl w-full max-w-sm p-10 shadow-2xl space-y-8 border-4 border-emerald-100">
              <div className="text-center">
                <div className="text-6xl mb-6 transform transition-transform hover:scale-110">🧶</div>
                <h2 className="text-3xl font-black text-slate-800">师傅核验确认</h2>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-[0.3em] font-bold">Verification Confirmation</p>
              </div>
              <div className="space-y-4">
                <p className="text-center text-slate-600">确定通过此任务的核验吗？</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleVerifyConfirm(false)}
                    className="flex-1 py-3 border border-slate-200 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleVerifyConfirm(true)}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 active:translate-y-1 transition-all"
                  >
                    确认通过
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {showAscendModal && (
          <motion.div
            key="ascend-modal"
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
