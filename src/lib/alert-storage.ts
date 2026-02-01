// Alert configuration and history storage
// In production, use database (Supabase). For now, using localStorage simulation.

import { AlertConfig, DEFAULT_CONFIG } from './telegram-bot';

interface AlertHistory {
  timestamp: number;
  alertType: string;
  reason: string;
  sent: boolean;
}

// In-memory storage (replace with Supabase in production)
let alertConfig: AlertConfig = { ...DEFAULT_CONFIG };
let lastAlertTime: number = 0;
let alertHistory: AlertHistory[] = [];

export function getAlertConfig(): AlertConfig {
  return { ...alertConfig };
}

export function updateAlertConfig(updates: Partial<AlertConfig>): AlertConfig {
  alertConfig = { ...alertConfig, ...updates };
  return alertConfig;
}

export function getLastAlertTime(): number {
  return lastAlertTime;
}

export function setLastAlertTime(time: number): void {
  lastAlertTime = time;
}

export function canSendAlert(minMinutesBetween: number): boolean {
  const now = Date.now();
  const minMs = minMinutesBetween * 60 * 1000;
  return now - lastAlertTime >= minMs;
}

export function addAlertToHistory(alert: AlertHistory): void {
  alertHistory.unshift(alert);
  // Keep only last 100 alerts
  if (alertHistory.length > 100) {
    alertHistory = alertHistory.slice(0, 100);
  }
}

export function getAlertHistory(): AlertHistory[] {
  return [...alertHistory];
}