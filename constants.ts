
import { MetricDefinition, PlatformDefinition, ChangeTypeDefinition } from "./types";

export const BRAND_COLOR = '#e84661';

// Sentinel "platform" id for the master Cockpit view (all platforms combined)
export const MASTER_VIEW_ID = '__master__';

// Palette for multi-metric lines
export const CHART_COLORS = [
  '#FF7D5D', // Cantaloupe (Primary)
  '#6FCF97', // Honeydew (Fresh Green)
  '#FF5C8D', // Watermelon (Vibrant Pink)
  '#FFBE0B', // Golden Melon (Warm Yellow)
  '#7F9CF5', // Cool Blue (Contrast)
  '#A78BFA', // Soft Purple (Contrast)
];

export const DEFAULT_PLATFORMS: PlatformDefinition[] = [
  { id: 'linkedin', label: 'LinkedIn Ads', color: '#0077b5' },
  { id: 'google', label: 'Google Ads', color: '#4285F4' },
  { id: 'meta', label: 'Meta Ads', color: '#1877F2' },
  { id: 'website', label: 'Website', color: '#7bc765', emoji: '🌐' },
];

// Custom metrics for the Website platform, registered in metricsConfig
// exactly like user-created custom metrics (values live in customMetrics)
export const WEBSITE_CUSTOM_METRICS: Omit<MetricDefinition, 'platform'>[] = [
  { key: 'sessions', label: 'Sessions', format: 'number', aggregation: 'sum' },
  { key: 'brandedSearch', label: 'Branded Search', format: 'number', aggregation: 'sum' },
  { key: 'demoRequests', label: 'Demo Requests', format: 'number', aggregation: 'sum' },
];

export const DEFAULT_CHANGE_TYPES_TEMPLATE: Omit<ChangeTypeDefinition, 'platform'>[] = [
  { id: 'ads-added', label: 'Ads added' },
  { id: 'ads-deleted', label: 'Ads deleted' },
  { id: 'campaign-paused', label: 'Campaign paused' },
  { id: 'budget-changed', label: 'Budget changed' },
  { id: 'bid-strategy-changed', label: 'Bid strategy changed' },
  { id: 'targeting-updated', label: 'Targeting updated' },
  { id: 'ad-copy-changed', label: 'Ad copy changed' },
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
  { key: 'cpa', label: 'CPA', format: 'currency', aggregation: 'average', isDerived: true },
  { key: 'conversionRate', label: 'Conv. Rate', format: 'percent', aggregation: 'average', isDerived: true },
];
