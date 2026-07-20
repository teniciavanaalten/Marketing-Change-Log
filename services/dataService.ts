import { ChangeLog, DailyMetric, Platform, ImportRecord, Campaign } from "../types";
import { MASTER_VIEW_ID } from "../constants";
import { load, save, hasKey, clearAllMelonStorage, storageKeys, SCHEMA_VERSION } from "./storage";

type MockDb = {
  logs: ChangeLog[];
  metrics: DailyMetric[];
  imports: ImportRecord[];
  campaigns: Campaign[];
};

// --- Seeded demo dataset -----------------------------------------------------
// A deterministic ~90-day B2B SaaS story (last 90 days ending today) so the
// Cockpit's correlation mode demonstrates the concept instantly.
// Story: LinkedIn ABM campaign goes live around day 25 → website sessions lift
// ~+25% three days later → branded search climbs ~+40% two weeks later →
// demo requests lift from ~day 50. Google Ads budget increase around day 60.
const seedDemoData = (): { metrics: DailyMetric[]; logs: ChangeLog[] } => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const DAYS = 90;
  const metrics: DailyMetric[] = [];

  // Deterministic pseudo-random in [0, 1): fixed formula, no Math.random
  const noise = (i: number, salt: number) => {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  const endUtc = new Date(new Date().toISOString().split('T')[0]).getTime();
  const startUtc = endUtc - (DAYS - 1) * DAY_MS;
  const dateAt = (i: number) => new Date(startUtc + i * DAY_MS).toISOString().split('T')[0];

  for (let i = 0; i < DAYS; i++) {
    const d = new Date(startUtc + i * DAY_MS);
    const dow = d.getUTCDay();
    const wk = (dow === 0 || dow === 6) ? 0.6 : 1; // Weekly seasonality: quieter weekends

    // LinkedIn: modest baseline; ABM campaign live from day 25
    const abm = i >= 25;
    const liImps = Math.round((abm ? 9000 : 3500) * wk * (0.85 + 0.3 * noise(i, 1)));
    const liClicks = Math.round(liImps * (0.004 + 0.002 * noise(i, 2)));
    const liSpend = Math.round((abm ? 260 : 90) * wk * (0.85 + 0.3 * noise(i, 3)));
    const liConv = (i >= 50 ? (noise(i, 4) > 0.5 ? 1 : 0) + (noise(i, 14) > 0.75 ? 1 : 0) : (noise(i, 4) > 0.85 ? 1 : 0));
    metrics.push({
      date: dateAt(i), platform: 'linkedin',
      impressions: liImps, clicks: liClicks, spend: liSpend, conversions: liConv,
      customMetrics: {}
    });

    // Google: modest baseline; budget increased from day 60
    const gBoost = i >= 60 ? 1.6 : 1;
    const gImps = Math.round(6000 * wk * gBoost * (0.85 + 0.3 * noise(i, 5)));
    const gClicks = Math.round(gImps * (0.025 + 0.01 * noise(i, 6)));
    const gSpend = Math.round(120 * wk * gBoost * (0.85 + 0.3 * noise(i, 7)));
    const gConv = Math.round(gClicks * (0.02 + 0.015 * noise(i, 8)));
    metrics.push({
      date: dateAt(i), platform: 'google',
      impressions: gImps, clicks: gClicks, spend: gSpend, conversions: gConv,
      customMetrics: {}
    });

    // Website: sessions lift +25% from day 28, branded search +40% from day 39,
    // demo requests lift from day 50
    const sessLift = i >= 28 ? 1.25 : 1;
    const brandLift = i >= 39 ? 1.4 : 1;
    const demoLift = i >= 50 ? 1.9 : 1;
    const sessions = Math.round(200 * wk * sessLift * (0.85 + 0.3 * noise(i, 9)));
    const brandedSearch = Math.round(30 * wk * brandLift * (0.8 + 0.4 * noise(i, 10)));
    const demoRequests = Math.round(1.5 * demoLift * (0.4 + 1.2 * noise(i, 11)));
    metrics.push({
      date: dateAt(i), platform: 'website',
      impressions: 0, clicks: 0, spend: 0, conversions: 0,
      customMetrics: { sessions, brandedSearch, demoRequests }
    });
  }

  const logs: ChangeLog[] = [
    {
      id: 'seed-log-1', platform: 'linkedin', campaignName: 'ABM - Enterprise NL',
      changeType: 'Ads added', description: 'LinkedIn ABM-campagne live',
      date: dateAt(25), tags: ['abm', 'launch']
    },
    {
      id: 'seed-log-2', platform: 'linkedin', campaignName: 'ABM - Enterprise NL',
      changeType: 'Ad copy changed', description: 'Nieuwe ad-varianten toegevoegd aan ABM-campagne',
      date: dateAt(40), tags: ['creative']
    },
    {
      id: 'seed-log-3', platform: 'google', campaignName: 'Search - Brand',
      changeType: 'Budget changed', description: 'Google Ads budget verhoogd',
      date: dateAt(60), tags: ['budget']
    },
    {
      id: 'seed-log-4', platform: 'meta', campaignName: 'Retargeting - All Visitors',
      changeType: 'Campaign paused', description: 'Meta retargeting gepauzeerd wegens lage ROAS',
      date: dateAt(12), tags: ['pause']
    }
  ];

  return { metrics, logs };
};

// --- Persistence -------------------------------------------------------------
// mockDb is the in-memory cache; localStorage is the source of truth across
// refreshes. Each mutation persists the affected collection.
const persistMetrics = () => save(storageKeys.metrics, mockDb.metrics);
const persistLogs = () => save(storageKeys.logs, mockDb.logs);
const persistImports = () => save(storageKeys.imports, mockDb.imports);
const persistCampaigns = () => save(storageKeys.campaigns, mockDb.campaigns);

const persistAll = () => {
  persistMetrics();
  persistLogs();
  persistImports();
  persistCampaigns();
  save(storageKeys.schemaVersion, SCHEMA_VERSION);
};

const buildDemoDb = (): MockDb => {
  const s = seedDemoData();
  return { logs: s.logs, metrics: s.metrics, imports: [], campaigns: [] };
};

const emptyDb = (): MockDb => ({ logs: [], metrics: [], imports: [], campaigns: [] });

// On module init: TRUE first load (no schemaVersion key) → seed the demo
// dataset and write it. Otherwise hydrate from storage (never re-seed).
const initDb = (): MockDb => {
  if (!hasKey(storageKeys.schemaVersion)) {
    const db = buildDemoDb();
    mockDb = db; // assign before persistAll (it reads mockDb)
    persistAll();
    return db;
  }
  const storedVersion = load<number>(storageKeys.schemaVersion, SCHEMA_VERSION);
  if (storedVersion !== SCHEMA_VERSION) {
    console.warn(
      `[melon] stored schemaVersion ${storedVersion} != ${SCHEMA_VERSION}; keeping data as-is (no migration).`
    );
  }
  return {
    logs: load<ChangeLog[]>(storageKeys.logs, []),
    metrics: load<DailyMetric[]>(storageKeys.metrics, []),
    imports: load<ImportRecord[]>(storageKeys.imports, []),
    campaigns: load<Campaign[]>(storageKeys.campaigns, []),
  };
};

// In-memory store (cache over localStorage)
let mockDb: MockDb = emptyDb();
mockDb = initDb();

export const dataService = {
  getMetrics: async (platform: Platform, start: string, end: string): Promise<DailyMetric[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    // MASTER_VIEW_ID means "all platforms"
    return mockDb.metrics.filter(m =>
      (platform === MASTER_VIEW_ID || m.platform === platform) &&
      m.date >= start &&
      m.date <= end
    ).sort((a, b) => a.date.localeCompare(b.date));
  },

  getChangeLogs: async (platform: Platform, start: string, end: string): Promise<ChangeLog[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    // MASTER_VIEW_ID means "all platforms"
    return mockDb.logs.filter(l =>
      (platform === MASTER_VIEW_ID || l.platform === platform) &&
      l.date >= start &&
      l.date <= end
    ).sort((a, b) => b.date.localeCompare(a.date)); // Newest first
  },

  addChangeLog: async (log: Omit<ChangeLog, 'id'>): Promise<ChangeLog> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
    mockDb.logs.unshift(newLog); // Add to beginning
    persistLogs();
    return newLog;
  },

  updateChangeLog: async (id: string, updates: Omit<ChangeLog, 'id'>): Promise<ChangeLog> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const updatedLog = { ...updates, id };
    const idx = mockDb.logs.findIndex(l => l.id === id);
    if (idx >= 0) {
      mockDb.logs[idx] = updatedLog;
    }
    persistLogs();
    return updatedLog;
  },

  deleteChangeLog: async (id: string): Promise<void> => {
    mockDb.logs = mockDb.logs.filter(l => l.id !== id);
    persistLogs();
  },

  getImports: async (platform: Platform): Promise<ImportRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.imports
      .filter(i => i.platform === platform)
      .sort((a, b) => b.importDate.localeCompare(a.importDate));
  },

  importMetrics: async (newMetrics: DailyMetric[], filename: string): Promise<ImportRecord> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const importId = Math.random().toString(36).substr(2, 9);
    const platform = newMetrics[0]?.platform || 'linkedin';

    const record: ImportRecord = {
      id: importId,
      filename,
      importDate: new Date().toISOString(),
      platform,
      rowCount: newMetrics.length
    };

    mockDb.imports.unshift(record);

    // Merge strategy: Overwrite if date+platform+campaign matches, else add
    // Tag new metrics with importId
    newMetrics.forEach(nm => {
      const metricWithId = { ...nm, importId };
      const idx = mockDb.metrics.findIndex(m =>
        m.date === nm.date &&
        m.platform === nm.platform &&
        m.campaignName === nm.campaignName
      );

      if (idx >= 0) {
        mockDb.metrics[idx] = metricWithId;
      } else {
        mockDb.metrics.push(metricWithId);
      }
    });

    persistImports();
    persistMetrics();
    return record;
  },

  deleteImport: async (importId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Remove the record
    mockDb.imports = mockDb.imports.filter(i => i.id !== importId);

    // Remove metrics associated with this import
    mockDb.metrics = mockDb.metrics.filter(m => m.importId !== importId);

    persistImports();
    persistMetrics();
  },

  // Campaign Management
  getCampaigns: async (platform: Platform): Promise<Campaign[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockDb.campaigns.filter(c => c.platform === platform);
  },

  addCampaign: async (name: string, platform: Platform): Promise<Campaign> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const newCampaign = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      platform
    };
    mockDb.campaigns.push(newCampaign);
    persistCampaigns();
    return newCampaign;
  },

  deleteCampaign: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    mockDb.campaigns = mockDb.campaigns.filter(c => c.id !== id);
    persistCampaigns();
  },

  // Reset all melon storage and re-seed the 90-day demo dataset.
  resetToDemo: async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    clearAllMelonStorage();
    mockDb = buildDemoDb();
    persistAll();
  },

  // Clear all melon storage and all data (config resets to defaults elsewhere).
  clearAllData: async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    clearAllMelonStorage();
    mockDb = emptyDb();
    persistAll();
  }
};