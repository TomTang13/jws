
export enum Realm {
  SPROUT = '萌芽期 · 织梦起航',
  BLOOM = '花期 · 创意迸发',
  HARVEST = '果实期 · 匠心结盟'
}

export type SkillPathId = 'beast' | 'armor' | 'botanist';

export interface SkillPath {
  id: SkillPathId;
  name: string;
  focus: string;
  perk: string;
  icon: string;
}

export interface LevelConfig {
  lv: number;
  title: string;
  englishTitle: string;
  inspirationRequired: number;
  exam: string;
  cost: string;
  perks: string[];
  realm: Realm;
  status: string;
  hook: string;
}

export interface PlayerStats {
  playerName?: string;
  hasOnboarded: boolean;
  level: number;
  coins: number;    
  yc: number;       
  inspiration: number; 
  completedQuests: string[];
  skillPath?: SkillPathId;
  inventory: string[];
  playStyle: 'Artisan' | 'Collector' | 'Hybrid';
}

export type QuestType = 'daily' | 'labor' | 'patron' | 'event';

export interface Quest {
  id: string;
  title: string;
  description: string;
  targetLv: number;
  rewardText: string;
  ycReward: number;      
  insReward: number;     
  cost?: number;         
  type: QuestType;
  categoryName: string;  
  purpose?: string;
  needs_verification?: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
}
