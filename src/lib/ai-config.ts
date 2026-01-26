// AI Provider Configuration

export type AIProvider = 'openai' | 'groq' | 'deepseek';

export interface AIModel {
  id: string;
  provider: AIProvider;
  name: string;
  description: string;
  contextWindow: number;
  costPer1MTokens: number | 'free';
  speed: 'fast' | 'medium' | 'slow';
  quality: 1 | 2 | 3 | 4 | 5;
}

export const AI_MODELS: Record<string, AIModel> = {
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    provider: 'openai',
    name: 'GPT-4o Mini',
    description: 'Fast & affordable, good for most tasks',
    contextWindow: 128000,
    costPer1MTokens: 0.15,
    speed: 'fast',
    quality: 3,
  },
  'llama-3.1-405b': {
    id: 'llama-3.1-405b-reasoning',
    provider: 'groq',
    name: 'Llama 3.1 405B',
    description: 'Most powerful open-source model, FREE via Groq',
    contextWindow: 131072,
    costPer1MTokens: 'free',
    speed: 'fast',
    quality: 5,
  },
  'deepseek-chat': {
    id: 'deepseek-chat',
    provider: 'deepseek',
    name: 'DeepSeek V3',
    description: 'Exceptional reasoning at ultra-low cost',
    contextWindow: 64000,
    costPer1MTokens: 0.14,
    speed: 'medium',
    quality: 5,
  },
};

export const DEFAULT_MODEL = 'gpt-4o-mini';

// Provider styling
export const PROVIDER_STYLES: Record<AIProvider, {
  gradient: string;
  border: string;
  glow: string;
  icon: string;
  badge: string;
  name: string;
}> = {
  openai: {
    gradient: 'from-emerald-500/20 via-teal-500/20 to-cyan-500/20',
    border: 'border-emerald-500/50 hover:border-emerald-400',
    glow: 'shadow-emerald-500/20 hover:shadow-emerald-500/40',
    icon: '✦',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
    name: 'OpenAI',
  },
  groq: {
    gradient: 'from-orange-500/20 via-amber-500/20 to-yellow-500/20',
    border: 'border-orange-500/50 hover:border-orange-400',
    glow: 'shadow-orange-500/20 hover:shadow-orange-500/40',
    icon: '⚡',
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
    name: 'Groq',
  },
  deepseek: {
    gradient: 'from-violet-500/20 via-purple-500/20 to-fuchsia-500/20',
    border: 'border-violet-500/50 hover:border-violet-400',
    glow: 'shadow-violet-500/20 hover:shadow-violet-500/40',
    icon: '◈',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/50',
    name: 'DeepSeek',
  },
};