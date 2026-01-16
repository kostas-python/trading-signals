'use client';

import { motion } from 'framer-motion';

export function AssetCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-terminal-border bg-terminal-surface/50 p-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-terminal-border" />
          <div>
            <div className="h-4 w-16 animate-pulse rounded bg-terminal-border" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-terminal-border" />
          </div>
        </div>
        <div className="h-8 w-8 animate-pulse rounded-lg bg-terminal-border" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="h-8 w-28 animate-pulse rounded bg-terminal-border" />
          <div className="mt-2 h-4 w-20 animate-pulse rounded bg-terminal-border" />
        </div>
        <div className="h-10 w-24 animate-pulse rounded bg-terminal-border" />
      </div>
      <div className="mt-4">
        <div className="h-1.5 w-full animate-pulse rounded-full bg-terminal-border" />
      </div>
    </motion.div>
  );
}

export function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <AssetCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}
