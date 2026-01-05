
import { ChangeType, MetricDefinition, PlatformDefinition } from "./types";

export const BRAND_COLOR = '#e84661';

// Palette for multi-metric lines
export const CHART_COLORS = [
  '#e84661', // Brand (Red/Pink)
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f97316', // Orange
];

export const DEFAULT_PLATFORMS: PlatformDefinition[] = [
  { id: 'linkedin', label: 'LinkedIn Ads', color: '#0077b5' },
  { id: 'google', label: 'Google Ads', color: '#4285F4' },
  { id: 'meta', label: 'Meta Ads', color: '#1877F2' },
];

export const CHANGE_TYPES = Object.values(ChangeType);

export const MOCK_CAMPAIGNS = [
  "Q3 Lead Gen - USA",
  "Retargeting - All Visitors",
  "Brand Awareness - Top Funnel",
  "Competitor Conquesting",
];

// Default definitions used to seed the configuration
// We omit 'platform' here as it gets assigned during seeding
export const DEFAULT_METRICS_TEMPLATE: Omit<MetricDefinition, 'platform'>[] = [
  { key: 'spend', label: 'Spend', format: 'currency', aggregation: 'sum' },
  { key: 'clicks', label: 'Clicks', format: 'number', aggregation: 'sum' },
  { key: 'impressions', label: 'Impressions', format: 'number', aggregation: 'sum' },
  { key: 'conversions', label: 'Conversions', format: 'number', aggregation: 'sum' },
  { key: 'ctr', label: 'CTR', format: 'percent', aggregation: 'average', isDerived: true },
  { key: 'cpc', label: 'CPC', format: 'currency', aggregation: 'average', isDerived: true },
  { key: 'conversionRate', label: 'Conv. Rate', format: 'percent', aggregation: 'average', isDerived: true },
];
