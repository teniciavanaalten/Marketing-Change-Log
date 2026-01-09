import { ChangeLog, DailyMetric, Platform, ImportRecord, Campaign } from "../types";

// In-memory store to simulate database
let mockDb: {
  logs: ChangeLog[];
  metrics: DailyMetric[];
  imports: ImportRecord[];
  campaigns: Campaign[];
} = {
  logs: [],
  metrics: [],
  imports: [],
  campaigns: []
};

export const dataService = {
  getMetrics: async (platform: Platform, start: string, end: string): Promise<DailyMetric[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.metrics.filter(m =>
      m.platform === platform &&
      m.date >= start &&
      m.date <= end
    ).sort((a, b) => a.date.localeCompare(b.date));
  },

  getChangeLogs: async (platform: Platform, start: string, end: string): Promise<ChangeLog[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDb.logs.filter(l =>
      l.platform === platform &&
      l.date >= start &&
      l.date <= end
    ).sort((a, b) => b.date.localeCompare(a.date)); // Newest first
  },

  addChangeLog: async (log: Omit<ChangeLog, 'id'>): Promise<ChangeLog> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newLog = { ...log, id: Math.random().toString(36).substr(2, 9) };
    mockDb.logs.unshift(newLog); // Add to beginning
    return newLog;
  },

  deleteChangeLog: async (id: string): Promise<void> => {
    mockDb.logs = mockDb.logs.filter(l => l.id !== id);
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

    return record;
  },

  deleteImport: async (importId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Remove the record
    mockDb.imports = mockDb.imports.filter(i => i.id !== importId);

    // Remove metrics associated with this import
    mockDb.metrics = mockDb.metrics.filter(m => m.importId !== importId);
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
    return newCampaign;
  },

  deleteCampaign: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    mockDb.campaigns = mockDb.campaigns.filter(c => c.id !== id);
  }
};