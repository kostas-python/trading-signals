'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Brain, ChevronDown, Check, Lock, Crown, Gem, Star } from 'lucide-react';
import { AI_MODELS, PROVIDER_STYLES, AIProvider, DEFAULT_MODEL } from '@/lib/ai-config';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelKey: string) => void;
  compact?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, compact = false }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>(['openai']);

  // Check available providers on mount
  useEffect(() => {
    const checkProviders = async () => {
      try {
        const res = await fetch('/api/ai/providers');
        if (res.ok) {
          const data = await res.json();
          setAvailableProviders(data.providers || ['openai']);
        }
      } catch (e) {
        console.error('Failed to check providers:', e);
      }
    };
    checkProviders();
  }, []);

  const currentModel = AI_MODELS[selectedModel] || AI_MODELS[DEFAULT_MODEL];
  const currentStyle = PROVIDER_STYLES[currentModel.provider];

  const getProviderIcon = (provider: AIProvider) => {
    switch (provider) {
      case 'openai': return <Sparkles className="h-4 w-4" />;
      case 'groq': return <Zap className="h-4 w-4" />;
      case 'deepseek': return <Gem className="h-4 w-4" />;
    }
  };

  const getQualityStars = (quality: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < quality ? 'fill-current text-yellow-400' : 'text-gray-600'}`} 
      />
    ));
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
            border transition-all duration-300
            bg-gradient-to-r ${currentStyle.gradient}
            ${currentStyle.border}
            shadow-lg ${currentStyle.glow}
          `}
        >
          {getProviderIcon(currentModel.provider)}
          <span>{currentModel.name}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-72 z-50"
            >
              <div className="rounded-xl border border-terminal-border bg-terminal-surface/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                {Object.entries(AI_MODELS).map(([key, model]) => {
                  const style = PROVIDER_STYLES[model.provider];
                  const isAvailable = availableProviders.includes(model.provider);
                  const isSelected = selectedModel === key;

                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (isAvailable) {
                          onModelChange(key);
                          setIsOpen(false);
                        }
                      }}
                      disabled={!isAvailable}
                      className={`
                        w-full p-3 text-left transition-all duration-300
                        ${isSelected ? `bg-gradient-to-r ${style.gradient}` : 'hover:bg-terminal-border/30'}
                        ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        border-b border-terminal-border/50 last:border-b-0
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${style.badge.split(' ')[1]}`}>{style.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white text-sm">{model.name}</span>
                              {model.costPer1MTokens === 'free' && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 rounded border border-green-500/50">
                                  FREE
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-terminal-muted">{style.name}</span>
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-green-400" />}
                        {!isAvailable && <Lock className="h-4 w-4 text-terminal-muted" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full size selector
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-terminal-muted">
        <Brain className="h-4 w-4" />
        <span>AI Model</span>
      </div>
      
      <div className="grid gap-3">
        {Object.entries(AI_MODELS).map(([key, model]) => {
          const style = PROVIDER_STYLES[model.provider];
          const isAvailable = availableProviders.includes(model.provider);
          const isSelected = selectedModel === key;

          return (
            <motion.button
              key={key}
              onClick={() => isAvailable && onModelChange(key)}
              disabled={!isAvailable}
              whileHover={isAvailable ? { scale: 1.02 } : {}}
              whileTap={isAvailable ? { scale: 0.98 } : {}}
              className={`
                relative p-4 rounded-xl text-left transition-all duration-500
                border-2 overflow-hidden group
                ${isSelected 
                  ? `bg-gradient-to-r ${style.gradient} ${style.border} shadow-lg ${style.glow}` 
                  : 'border-terminal-border hover:border-terminal-muted bg-terminal-bg/50'
                }
                ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Luxury shimmer effect for selected */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
              )}

              {/* Crown for top quality */}
              {model.quality === 5 && (
                <div className="absolute top-2 right-2">
                  <Crown className={`h-4 w-4 ${isSelected ? 'text-yellow-400' : 'text-yellow-600'}`} />
                </div>
              )}

              <div className="relative flex items-start gap-4">
                {/* Provider icon */}
                <div className={`
                  p-3 rounded-xl border transition-all duration-300
                  ${isSelected 
                    ? `${style.badge}` 
                    : 'bg-terminal-border/50 border-terminal-border text-terminal-muted'
                  }
                `}>
                  <span className="text-2xl">{style.icon}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-bold ${isSelected ? 'text-white' : 'text-terminal-muted'}`}>
                      {model.name}
                    </h3>
                    {model.costPer1MTokens === 'free' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 rounded-full border border-green-500/50 animate-pulse">
                        FREE
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-xs mb-2 ${isSelected ? 'text-white/80' : 'text-terminal-muted'}`}>
                    {model.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      {getQualityStars(model.quality)}
                    </div>
                    <span className={`px-2 py-0.5 rounded ${
                      model.speed === 'fast' 
                        ? 'bg-green-500/20 text-green-400' 
                        : model.speed === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {model.speed === 'fast' ? '⚡ Fast' : model.speed === 'medium' ? '⏱ Medium' : '🐢 Slow'}
                    </span>
                    {model.costPer1MTokens !== 'free' && (
                      <span className="text-terminal-muted">
                        ${model.costPer1MTokens}/1M tokens
                      </span>
                    )}
                  </div>
                </div>

                {/* Selection indicator */}
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                  ${isSelected 
                    ? `${style.border.replace('hover:', '')} bg-gradient-to-r ${style.gradient}` 
                    : 'border-terminal-border'
                  }
                `}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
              </div>

              {/* Locked overlay */}
              {!isAvailable && (
                <div className="absolute inset-0 bg-terminal-bg/60 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-terminal-muted">
                    <Lock className="h-4 w-4" />
                    <span className="text-xs">API key not configured</span>
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* API key hints */}
      <div className="text-xs text-terminal-muted space-y-1 p-3 rounded-lg bg-terminal-bg/50 border border-terminal-border">
        <p className="font-medium text-white mb-2">API Keys Required:</p>
        <p>• OpenAI: <code className="text-emerald-400">OPENAI_API_KEY</code></p>
        <p>• Groq (FREE): <code className="text-orange-400">GROQ_API_KEY</code> → <a href="https://console.groq.com" target="_blank" className="underline hover:text-orange-400">console.groq.com</a></p>
        <p>• DeepSeek: <code className="text-violet-400">DEEPSEEK_API_KEY</code> → <a href="https://platform.deepseek.com" target="_blank" className="underline hover:text-violet-400">platform.deepseek.com</a></p>
      </div>
    </div>
  );
}