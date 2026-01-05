
export type Platform = string;

export interface PlatformDefinition {
  id: string;
  label: string;
  color: string;
  emoji?: string;
}

export enum ChangeType {
  CREATE_AD = 'Create Ad',
  DELETE_AD = 'Delete Ad',
  PAUSE_CAMPAIGN = 'Pause Campaign',
  ENABLE_CAMPAIGN = 'Enable Campaign',
  BUDGET_CHANGE = 'Budget Change',
  BID_STRATEGY = 'Bid Strategy',
  TARGETING = 'Targeting Update',
  CREATIVE = 'Creative Update',
  CUSTOM = 'Custom',
}

export interface ChangeLog {
  id: string;
  platform: Platform;
  campaignName: string;
  changeType: ChangeType | string;
  description: string;
  date: string; // ISO 8601 YYYY-MM-DD
  tags: string[];
}

export interface ImportRecord {
  id: string;
  filename: string;
  importDate: string; // ISO timestamp
  platform: Platform;
  rowCount: number;
}

export interface DailyMetric {
  date: string; // ISO 8601 YYYY-MM-DD
  platform: Platform;
  campaignName?: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  importId?: string; // Links metric to a specific import batch
  customMetrics?: Record<string, number>; // Dynamic key-value for user defined metrics
}

// Calculated metrics for display
export interface ComputedMetric extends DailyMetric {
  ctr: number; // %
  cpc: number; // currency
  cpa: number; // currency
  conversionRate: number; // %
}

export interface DateRange {
  start: string;
  end: string;
}

export type MetricKey = string;

export interface MetricDefinition {
  key: string;
  label: string;
  format: 'number' | 'currency' | 'percent';
  aggregation: 'sum' | 'average';
  platform: Platform;
  isDerived?: boolean; // If true, this metric is calculated (e.g. CTR), not imported
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Campaign {
  id: string;
  name: string;
  platform: Platform;
}
