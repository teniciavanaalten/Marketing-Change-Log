import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, DateRange, User, MetricDefinition, PlatformDefinition, Campaign, ChangeTypeDefinition } from '../types';
import { DEFAULT_METRICS_TEMPLATE, DEFAULT_PLATFORMS, DEFAULT_CHANGE_TYPES_TEMPLATE } from '../constants';
import { dataService } from '../services/dataService';

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
  user: User | null;
  login: () => void;
  logout: () => void;
  metricsConfig: MetricDefinition[];
  addMetric: (metric: MetricDefinition) => void;
  removeMetric: (key: string, platform: Platform) => void;
  resetMetrics: (platform: Platform) => void;
  changeTypesConfig: ChangeTypeDefinition[];
  addChangeType: (changeType: ChangeTypeDefinition) => void;
  removeChangeType: (id: string, platform: Platform) => void;
  resetChangeTypes: (platform: Platform) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>(DEFAULT_PLATFORMS);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('linkedin');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [user, setUser] = useState<User | null>({ id: '1', name: 'Demo Marketer', email: 'demo@marketer.io' });

  // Initialize metrics with defaults for ALL default platforms
  // Note: For custom platforms added later, we add metrics dynamically
  const [metricsConfig, setMetricsConfig] = useState<MetricDefinition[]>(() => {
    return DEFAULT_PLATFORMS.flatMap(p =>
      DEFAULT_METRICS_TEMPLATE.map(m => ({ ...m, platform: p.id }))
    );
  });

  // Initialize change types with defaults for ALL default platforms
  const [changeTypesConfig, setChangeTypesConfig] = useState<ChangeTypeDefinition[]>(() => {
    return DEFAULT_PLATFORMS.flatMap(p =>
      DEFAULT_CHANGE_TYPES_TEMPLATE.map(ct => ({ ...ct, platform: p.id }))
    );
  });

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

  // Load campaigns when platform changes or initially
  const refreshCampaigns = async () => {
    try {
      // We load ALL campaigns so sidebar can show them, or filter by platform there
      // simpler to load all or just filter inside dataService if needed.
      // For now, let's load all campaigns efficiently or just for selected?
      // Sidebar needs to show campaigns for ALL platforms if we want to expand them.
      // So let's fetch all. But dataService.getCampaigns takes a platform arg.
      // Let's modify usage or assume we want mainly for selected platform?
      // Wait, Sidebar design: user clicks platform -> sees campaigns.
      // If we want to show campaigns nested under each platform in sidebar, we need ALL campaigns or fetch on demand.
      // For simplicity, let's fetch for the selected platform whenever it changes, 
      // BUT if we want to show counts or lists in sidebar for other platforms, we might need more.
      // Actually, let's stick to: we need campaigns for the current view. 
      // BUT Sidebar wants to list them. 
      // Let's try to fetch all if possible, or iterate.
      // dataService.getCampaigns(platform) -- let's optimize this later.
      // For now, let's just fetch for the CURRENT platform to update the context 'campaigns' 
      // effectively making 'campaigns' local to the selected platform?
      // NO, if we want the sidebar to always show them, we need a better strategy. 
      // Let's change this: `campaigns` in context will hold campaigns for the SELECTED platform 
      // OR we change dataService to return all.
      // Be careful. unique IDs across platforms?

      // Let's just fetch for the selected platform for now to preserve existing logic flow,
      // and maybe Sidebar only shows campaigns for the *active* platform?
      // "When a platform is expanded..." - usually implies accordion.
      // If I expand LinkedIn, I see LinkedIn campaigns. 
      // If I expand Facebook, I see Facebook campaigns.
      // So I might need all campaigns loaded.

      // Let's iterate all platforms to get all campaigns?
      // That might be expensive.
      // Let's just store "all campaigns" in a flat list in context?

      // Temporary solution: Fetch for selected platform, update that list.
      // Wait, if I change platform, I lose the others?
      // If I want to render them in sidebar, I need them.

      // Let's make `refreshCampaigns` fetch for the *selected* platform and maybe we only show them for the selected one in Sidebar?
      // Plan says: "When a platform is expanded: Show Overview link... Show list of Campaigns".
      // This implies we could fetch when expanded.

      // Let's start by just fetching for ALL platforms effectively?
      // Or just fetch for current.
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

  const login = () => {
    setUser({ id: '1', name: 'Demo Marketer', email: 'demo@marketer.io' });
  };

  const logout = () => {
    setUser(null);
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
      user,
      login,
      logout,
      metricsConfig,
      addMetric,
      removeMetric,
      resetMetrics,
      changeTypesConfig,
      addChangeType,
      removeChangeType,
      resetChangeTypes
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