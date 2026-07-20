import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, DateRange, MetricDefinition, PlatformDefinition, Campaign, ChangeTypeDefinition } from '../types';
import { DEFAULT_METRICS_TEMPLATE, DEFAULT_PLATFORMS, DEFAULT_CHANGE_TYPES_TEMPLATE, WEBSITE_CUSTOM_METRICS } from '../constants';
import { dataService } from '../services/dataService';
import { load, save, storageKeys } from '../services/storage';

// Default config builders (reused for seeding, hydration fallback, and reset)
const buildDefaultMetricsConfig = (): MetricDefinition[] => {
  const base = DEFAULT_PLATFORMS.flatMap(p =>
    DEFAULT_METRICS_TEMPLATE.map(m => ({ ...m, platform: p.id }))
  );
  // Website's custom metrics, registered like user-created custom metrics
  const website = WEBSITE_CUSTOM_METRICS.map(m => ({ ...m, platform: 'website' }));
  return [...base, ...website];
};

const buildDefaultChangeTypes = (): ChangeTypeDefinition[] =>
  DEFAULT_PLATFORMS.flatMap(p =>
    DEFAULT_CHANGE_TYPES_TEMPLATE.map(ct => ({ ...ct, platform: p.id }))
  );

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  platforms: PlatformDefinition[];
  addPlatform: (def: Omit<PlatformDefinition, 'id'>) => void;
  removePlatform: (id: string) => void;
  selectedPlatform: Platform;
  setSelectedPlatform: (p: Platform) => void;
  selectedCampaignId: string | null;
  setSelectedCampaignId: (id: string | null) => void;
  campaigns: Campaign[];
  refreshCampaigns: () => Promise<void>;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  metricsConfig: MetricDefinition[];
  addMetric: (metric: MetricDefinition) => void;
  removeMetric: (key: string, platform: Platform) => void;
  resetMetrics: (platform: Platform) => void;
  changeTypesConfig: ChangeTypeDefinition[];
  addChangeType: (changeType: ChangeTypeDefinition) => void;
  removeChangeType: (id: string, platform: Platform) => void;
  resetChangeTypes: (platform: Platform) => void;
  resetConfigToDefaults: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Config is persisted: hydrate from localStorage, falling back to defaults.
  // (selectedPlatform / dateRange / campaigns are transient — not persisted.)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => load<'light' | 'dark'>(storageKeys.theme, 'light'));
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>(() => load(storageKeys.platforms, DEFAULT_PLATFORMS));
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('linkedin');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [metricsConfig, setMetricsConfig] = useState<MetricDefinition[]>(() =>
    load(storageKeys.metricsConfig, buildDefaultMetricsConfig())
  );

  const [changeTypesConfig, setChangeTypesConfig] = useState<ChangeTypeDefinition[]>(() =>
    load(storageKeys.changeTypes, buildDefaultChangeTypes())
  );

  // Persist config on change (transient UI state is never persisted)
  useEffect(() => { save(storageKeys.theme, theme); }, [theme]);
  useEffect(() => { save(storageKeys.platforms, platforms); }, [platforms]);
  useEffect(() => { save(storageKeys.metricsConfig, metricsConfig); }, [metricsConfig]);
  useEffect(() => { save(storageKeys.changeTypes, changeTypesConfig); }, [changeTypesConfig]);

  // Default date range: Last 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [dateRange, setDateRange] = useState<DateRange>({
    start: thirtyDaysAgo.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load campaigns for all platforms so the sidebar can list them per platform
  const refreshCampaigns = async () => {
    try {
      const all: Campaign[] = [];
      for (const p of platforms) {
        const c = await dataService.getCampaigns(p.id);
        all.push(...c);
      }
      setCampaigns(all);
    } catch (e) {
      console.error("Failed to load campaigns", e);
    }
  };

  useEffect(() => {
    refreshCampaigns();
  }, [platforms]); // Reload if platforms change. Also initially.

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const addPlatform = (def: Omit<PlatformDefinition, 'id'>) => {
    const id = def.label.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
    const newPlatform = { ...def, id };

    setPlatforms(prev => [...prev, newPlatform]);

    setMetricsConfig(prev => {
      const defaults = DEFAULT_METRICS_TEMPLATE.map(m => ({ ...m, platform: id }));
      return [...prev, ...defaults];
    });

    setChangeTypesConfig(prev => {
      const defaults = DEFAULT_CHANGE_TYPES_TEMPLATE.map(ct => ({ ...ct, platform: id }));
      return [...prev, ...defaults];
    });

    setSelectedPlatform(id);
    setSelectedCampaignId(null); // Reset campaign when adding/selecting new
  };

  const removePlatform = (id: string) => {
    if (platforms.length <= 1) return;

    setPlatforms(prev => prev.filter(p => p.id !== id));
    setMetricsConfig(prev => prev.filter(m => m.platform !== id));
    setChangeTypesConfig(prev => prev.filter(ct => ct.platform !== id));

    if (selectedPlatform === id) {
      const remaining = platforms.filter(p => p.id !== id);
      if (remaining.length > 0) {
        setSelectedPlatform(remaining[0].id);
        setSelectedCampaignId(null);
      }
    }
  };

  const addMetric = (metric: MetricDefinition) => {
    setMetricsConfig(prev => {
      const exists = prev.some(m => m.key === metric.key && m.platform === metric.platform);
      if (exists) return prev;
      return [...prev, metric];
    });
  };

  const removeMetric = (key: string, platform: Platform) => {
    setMetricsConfig(prev => prev.filter(m => !(m.key === key && m.platform === platform)));
  };

  const resetMetrics = (platform: Platform) => {
    setMetricsConfig(prev => {
      const others = prev.filter(m => m.platform !== platform);
      const defaults = DEFAULT_METRICS_TEMPLATE.map(m => ({ ...m, platform }));
      return [...others, ...defaults];
    });
  };

  const addChangeType = (changeType: ChangeTypeDefinition) => {
    setChangeTypesConfig(prev => {
      const exists = prev.some(ct => ct.id === changeType.id && ct.platform === changeType.platform);
      if (exists) return prev;
      return [...prev, changeType];
    });
  };

  const removeChangeType = (id: string, platform: Platform) => {
    setChangeTypesConfig(prev => prev.filter(ct => !(ct.id === id && ct.platform === platform)));
  };

  const resetChangeTypes = (platform: Platform) => {
    setChangeTypesConfig(prev => {
      const others = prev.filter(ct => ct.platform !== platform);
      const defaults = DEFAULT_CHANGE_TYPES_TEMPLATE.map(ct => ({ ...ct, platform }));
      return [...others, ...defaults];
    });
  };

  // Reset ALL config back to defaults (used by the reset/clear data controls).
  // Save-effects re-persist the new defaults.
  const resetConfigToDefaults = () => {
    setPlatforms(DEFAULT_PLATFORMS);
    setMetricsConfig(buildDefaultMetricsConfig());
    setChangeTypesConfig(buildDefaultChangeTypes());
    setSelectedPlatform('linkedin');
    setSelectedCampaignId(null);
  };

  return (
    <AppContext.Provider value={{
      theme,
      toggleTheme,
      platforms,
      addPlatform,
      removePlatform,
      selectedPlatform,
      setSelectedPlatform,
      selectedCampaignId,
      setSelectedCampaignId,
      campaigns,
      refreshCampaigns,
      dateRange,
      setDateRange,
      metricsConfig,
      addMetric,
      removeMetric,
      resetMetrics,
      changeTypesConfig,
      addChangeType,
      removeChangeType,
      resetChangeTypes,
      resetConfigToDefaults
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};