'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Sparkles, Bot, User } from 'lucide-react';
import { Asset, CombinedSignal } from '@/types';
import { ModelSelector } from './ModelSelector';
import { PROVIDER_STYLES, AI_MODELS } from '@/lib/ai-config';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  provider?: string;
}

interface AIChatPanelProps {
  assets: Asset[];
  signals: Record<string, CombinedSignal>;
}

export function AIChatPanel({ assets, signals }: AIChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi! I\'m your trading assistant. Ask me about market trends, specific assets, or what the indicators mean.\n\nTry:\n• "Which assets have strong buy signals?"\n• "Explain what RSI means"\n• "What\'s the current market sentiment?"',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const currentModel = AI_MODELS[selectedModel];
  const currentStyle = currentModel ? PROVIDER_STYLES[currentModel.provider] : PROVIDER_STYLES.openai;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          context: { assets, signals },
          model: selectedModel, // Pass selected model
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Sorry, I couldn\'t process that request.',
        timestamp: new Date(),
        model: data.model,
        provider: data.provider,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I couldn't process that request.\n\nError: ${errorMsg}\n\nMake sure your API key is configured in .env.local`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-accent-purple/50 bg-terminal-surface shadow-lg shadow-accent-purple/20"
      >
        <div className="relative">
          <MessageCircle className="h-6 w-6 text-accent-purple" />
          <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-accent-cyan" />
        </div>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex h-[550px] w-[400px] flex-col overflow-hidden rounded-2xl border border-terminal-border bg-terminal-bg shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-terminal-border bg-terminal-surface px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${currentStyle.gradient}`}>
                  <span className="text-lg">{currentStyle.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI Assistant</h3>
                  <p className="text-xs text-terminal-muted">
                    {currentModel?.name || 'Select model'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  compact
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-terminal-muted hover:bg-terminal-border hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                      message.role === 'user'
                        ? 'bg-accent-cyan/20'
                        : `bg-gradient-to-br ${currentStyle.gradient}`
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-3.5 w-3.5 text-accent-cyan" />
                    ) : (
                      <span className="text-sm">{currentStyle.icon}</span>
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-accent-cyan/20 text-white'
                        : 'bg-terminal-surface text-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                    {/* Show model badge for assistant messages */}
                    {message.role === 'assistant' && message.provider && (
                      <p className="mt-1 text-[10px] text-terminal-muted opacity-60">
                        via {message.provider}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${currentStyle.gradient}`}>
                    <span className="text-sm">{currentStyle.icon}</span>
                  </div>
                  <div className="rounded-xl bg-terminal-surface px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-accent-cyan" />
                      <span className="text-xs text-terminal-muted">
                        {currentModel?.name} is thinking...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-terminal-border bg-terminal-surface p-3">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about markets, sentiment, signals..."
                  className="flex-1 rounded-xl border border-terminal-border bg-terminal-bg px-4 py-2.5 text-sm text-white placeholder-terminal-muted outline-none focus:border-accent-cyan"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-cyan text-terminal-bg disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}