import { ChangeType, Platform } from "./types";

export const BRAND_COLOR = '#e84661';

export const PLATFORMS: { id: Platform; label: string; color: string }[] = [
  { id: 'linkedin', label: 'LinkedIn Ads', color: '#0077b5' },
  { id: 'google', label: 'Google Ads', color: '#4285F4' },
  { id: 'meta', label: 'Meta Ads', color: '#1877F2' },
];

export const CHANGE_TYPES = Object.values(ChangeType);

export const METRIC_OPTIONS: { key: string; label: string; format: 'number' | 'currency' | 'percent' }[] = [
  { key: 'spend', label: 'Spend', format: 'currency' },
  { key: 'clicks', label: 'Clicks', format: 'number' },
  { key: 'impressions', label: 'Impressions', format: 'number' },
  { key: 'ctr', label: 'CTR', format: 'percent' },
  { key: 'cpc', label: 'CPC', format: 'currency' },
  { key: 'conversions', label: 'Conversions', format: 'number' },
  { key: 'conversionRate', label: 'Conv. Rate', format: 'percent' },
];

export const MOCK_CAMPAIGNS = [
  "Q3 Lead Gen - USA",
  "Retargeting - All Visitors",
  "Brand Awareness - Top Funnel",
  "Competitor Conquesting",
];