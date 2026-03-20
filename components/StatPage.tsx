
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getGlobalStats } from '../src/dataService';

interface StatPageProps {
    onBack: () => void;
}

export const StatPage: React.FC<StatPageProps> = ({ onBack }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showMore, setShowMore] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                console.log('开始获取全局统计数据...');
                const data = await getGlobalStats();
                console.log('获取全局统计数据成功:', data);
                setStats(data);
            } catch (error) {
                console.error('获取全局统计数据失败:', error);
                setStats({ logins: [], quests: [], levels: [] });
            } finally {
                setLoading(false);
                console.log('统计数据加载完成');
            }
        }
        fetchData();
    }, []);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <div className="animate-spin text-4xl mb-4">🌀</div>
                <p className="text-slate-400 font-serif">正在翻阅织梦典籍...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <span className="text-2xl">📊</span> 织梦统计
                </h2>
                <button
                    onClick={onBack}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                >
                    返回
                </button>
            </div>

            {/* 1. 最近登录 */}
            <section className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
                    <span className="text-lg">🕯️</span> 最新登录
                </h3>
                <div className="space-y-3">
                    {(showMore ? stats.logins : stats.logins.slice(0, 5)).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700">{item.profiles.nickname}</span>
                            <span className="text-slate-400 font-mono text-[10px]">{formatDate(item.login_time)}</span>
                        </div>
                    ))}
                    {stats.logins.length === 0 && <p className="text-center text-[10px] text-slate-300 py-4 italic">暂无记录</p>}
                    {stats.logins.length > 5 && (
                        <button 
                            onClick={() => setShowMore(!showMore)} 
                            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2"
                        >
                            {showMore ? '收起' : '更多'}
                        </button>
                    )}
                </div>
            </section>

            {/* 2. 最近任务 */}
            <section className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
                    <span className="text-lg">📜</span> 最新完成心愿
                </h3>
                <div className="space-y-4">
                    {(showMore ? stats.quests : stats.quests.slice(0, 5)).map((item: any, i: number) => (
                        <div key={i} className="flex flex-col gap-1 border-l-2 border-amber-100 pl-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-700">{item.profiles.nickname}</span>
                                <span className="text-slate-400 font-mono text-[9px]">{formatDate(item.completed_at)}</span>
                            </div>
                            <p className="text-[10px] text-amber-600 font-serif">达成：{item.quest_templates?.title || '未知心愿'}</p>
                        </div>
                    ))}
                    {stats.quests.length === 0 && <p className="text-center text-[10px] text-slate-300 py-4 italic">暂无记录</p>}
                    {stats.quests.length > 5 && (
                        <button 
                            onClick={() => setShowMore(!showMore)} 
                            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2"
                        >
                            {showMore ? '收起' : '更多'}
                        </button>
                    )}
                </div>
            </section>

            {/* 3. 最近升级 */}
            <section className="bg-white rounded-2xl border p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b pb-3">
                    <span className="text-lg">✨</span> 灵感突破 (晋升)
                </h3>
                <div className="space-y-4">
                    {(showMore ? stats.levels : stats.levels.slice(0, 5)).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-rose-50/30 p-3 rounded-xl border border-rose-100/50">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-rose-900">{item.profiles.nickname}</span>
                                <span className="text-slate-400 font-mono text-[9px]">{formatDate(item.promotion_date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-rose-100 text-rose-400">Lv.{item.old_level}</span>
                                <span className="text-slate-300">→</span>
                                <span className="text-xs font-black text-rose-600">Lv.{item.new_level}</span>
                            </div>
                        </div>
                    ))}
                    {stats.levels.length === 0 && <p className="text-center text-[10px] text-slate-300 py-4 italic">暂无记录</p>}
                    {stats.levels.length > 5 && (
                        <button 
                            onClick={() => setShowMore(!showMore)} 
                            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-2"
                        >
                            {showMore ? '收起' : '更多'}
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
};
