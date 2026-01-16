'use client';

import { motion } from 'framer-motion';
import { SignalStrength } from '@/types';
import { getSignalText, getSignalColor, getSignalBgColor } from '@/lib/utils';

interface SignalBadgeProps {
  signal: SignalStrength;
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
}

export function SignalBadge({ signal, size = 'md', showGlow = true }: SignalBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const glowClass = showGlow
    ? signal.includes('buy')
      ? 'glow-buy'
      : signal.includes('sell')
      ? 'glow-sell'
      : ''
    : '';

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center rounded-md border font-mono font-semibold tracking-wider
        ${sizeClasses[size]}
        ${getSignalColor(signal)}
        ${getSignalBgColor(signal)}
        ${glowClass}
      `}
    >
      {getSignalText(signal)}
    </motion.span>
  );
}
