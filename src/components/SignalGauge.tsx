'use client';

import { motion } from 'framer-motion';
import { CombinedSignal } from '@/types';
import { getSignalText, getSignalColor } from '@/lib/utils';

interface SignalGaugeProps {
  signal: CombinedSignal;
}

export function SignalGauge({ signal }: SignalGaugeProps) {
  // Convert score (-100 to 100) to percentage (0 to 100)
  const percentage = (signal.score + 100) / 2;
  
  // Angle for needle (-135 to 135 degrees)
  const needleAngle = (signal.score / 100) * 135;

  return (
    <div className="flex flex-col items-center">
      {/* Gauge */}
      <div className="relative h-32 w-64">
        {/* Background arc */}
        <svg className="h-full w-full" viewBox="0 0 200 120">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff3366" />
              <stop offset="30%" stopColor="#ff3366" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#00ff87" />
              <stop offset="100%" stopColor="#00ffff" />
            </linearGradient>
          </defs>
          
          {/* Background track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e1e2e"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Colored arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="251"
            strokeDashoffset={251 - (percentage / 100) * 251}
            className="transition-all duration-1000 ease-out"
          />
          
          {/* Tick marks */}
          {[-100, -50, 0, 50, 100].map((tick, i) => {
            const angle = ((tick / 100) * 135 - 180) * (Math.PI / 180);
            const x1 = 100 + 65 * Math.cos(angle);
            const y1 = 100 + 65 * Math.sin(angle);
            const x2 = 100 + 75 * Math.cos(angle);
            const y2 = 100 + 75 * Math.sin(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#6b7280"
                strokeWidth="2"
              />
            );
          })}
          
          {/* Needle */}
          <motion.g
            initial={{ rotate: -135 }}
            animate={{ rotate: needleAngle - 180 }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
            style={{ transformOrigin: '100px 100px' }}
          >
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="35"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="8" fill="#fff" />
            <circle cx="100" cy="100" r="4" fill="#0a0a0f" />
          </motion.g>
        </svg>
        
        {/* Score display */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <motion.div
            key={signal.score}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-display text-3xl font-bold text-white"
          >
            {signal.score > 0 ? '+' : ''}{signal.score}
          </motion.div>
        </div>
      </div>
      
      {/* Signal label */}
      <motion.div
        key={signal.overall}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`mt-2 font-display text-xl font-bold tracking-wider ${getSignalColor(signal.overall)}`}
      >
        {getSignalText(signal.overall)}
      </motion.div>
      
      {/* Indicator summary */}
      <div className="mt-3 flex gap-4 text-sm">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-signal-buy" />
          <span className="text-terminal-muted">{signal.bullishCount} Bullish</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-signal-neutral" />
          <span className="text-terminal-muted">{signal.neutralCount} Neutral</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-signal-sell" />
          <span className="text-terminal-muted">{signal.bearishCount} Bearish</span>
        </div>
      </div>
    </div>
  );
}
