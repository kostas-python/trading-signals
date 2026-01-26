// Multi-provider AI client

import OpenAI from 'openai';
import { AIProvider, AI_MODELS } from './ai-config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

interface CompletionResult {
  content: string;
  model: string;
  provider: AIProvider;
}

// Get the provider for a model ID
export function getProviderForModel(modelKey: string): AIProvider {
  return AI_MODELS[modelKey]?.provider || 'openai';
}

// Create completion using the appropriate provider
export async function createCompletion(options: CompletionOptions): Promise<CompletionResult> {
  const modelConfig = Object.values(AI_MODELS).find(m => m.id === options.model);
  const provider = modelConfig?.provider || 'openai';
  
  switch (provider) {
    case 'groq':
      return await createGroqCompletion(options);
    case 'deepseek':
      return await createDeepSeekCompletion(options);
    case 'openai':
    default:
      return await createOpenAICompletion(options);
  }
}

// OpenAI completion
async function createOpenAICompletion(options: CompletionOptions): Promise<CompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({ apiKey });
  
  const completion = await openai.chat.completions.create({
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 800,
  });

  return {
    content: completion.choices[0]?.message?.content || '',
    model: options.model,
    provider: 'openai',
  };
}

// Groq completion (Llama 3.1)
async function createGroqCompletion(options: CompletionOptions): Promise<CompletionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key not configured. Get free key at console.groq.com');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 800,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || '',
    model: options.model,
    provider: 'groq',
  };
}

// DeepSeek completion
async function createDeepSeekCompletion(options: CompletionOptions): Promise<CompletionResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DeepSeek API key not configured. Get key at platform.deepseek.com');
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 800,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API error: ${error}`);
  }

  const data = await response.json();
  
  return {
    content: data.choices[0]?.message?.content || '',
    model: options.model,
    provider: 'deepseek',
  };
}

// Check which providers are configured
export function getAvailableProviders(): AIProvider[] {
  const available: AIProvider[] = [];
  
  if (process.env.OPENAI_API_KEY) available.push('openai');
  if (process.env.GROQ_API_KEY) available.push('groq');
  if (process.env.DEEPSEEK_API_KEY) available.push('deepseek');
  
  return available;
}