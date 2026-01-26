import { NextResponse } from 'next/server';
import { AIProvider } from '@/lib/ai-config';

export async function GET() {
  const providers: AIProvider[] = [];
  
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  if (process.env.GROQ_API_KEY) providers.push('groq');
  if (process.env.DEEPSEEK_API_KEY) providers.push('deepseek');
  
  return NextResponse.json({ 
    providers,
    configured: {
      openai: !!process.env.OPENAI_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
    }
  });
}