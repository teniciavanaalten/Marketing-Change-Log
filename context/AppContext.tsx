import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, DateRange, User, MetricDefinition, PlatformDefinition } from '../types';
import { DEFAULT_METRICS_TEMPLATE, DEFAULT_PLATFORMS } from '../constants';

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  platforms: PlatformDefinition[];
  addPlatform: (def: Omit<PlatformDefinition, 'id'>) => void;
  removePlatform: (id: string) => void;
  selectedPlatform: Platform;
  setSelectedPlatform: (p: Platform) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  user: User | null;
  login: () => void;
  logout: () => void;
  metricsConfig: MetricDefinition[]; 
  addMetric: (metric: MetricDefinition) => void;
  removeMetric: (key: string, platform: Platform) => void;
  resetMetrics: (platform: Platform) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>(DEFAULT_PLATFORMS);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('linkedin');
  const [user, setUser] = useState<User | null>({ id: '1', name: 'Demo Marketer', email: 'demo@marketer.io' });
  
  // Initialize metrics with defaults for ALL default platforms
  // Note: For custom platforms added later, we add metrics dynamically
  const [metricsConfig, setMetricsConfig] = useState<MetricDefinition[]>(() => {
    return DEFAULT_PLATFORMS.flatMap(p => 
      DEFAULT_METRICS_TEMPLATE.map(m => ({ ...m, platform: p.id }))
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
    
    // Seed default metrics for this new platform
    setMetricsConfig(prev => {
      const defaults = DEFAULT_METRICS_TEMPLATE.map(m => ({ ...m, platform: id }));
      return [...prev, ...defaults];
    });

    // Automatically select the new platform
    setSelectedPlatform(id);
  };

  const removePlatform = (id: string) => {
    // Don't allow removing if it's the only one (optional safety)
    if (platforms.length <= 1) return;

    setPlatforms(prev => prev.filter(p => p.id !== id));
    
    // Switch selection if needed
    if (selectedPlatform === id) {
       const remaining = platforms.filter(p => p.id !== id);
       if (remaining.length > 0) {
         setSelectedPlatform(remaining[0].id);
       }
    }
  };

  const addMetric = (metric: MetricDefinition) => {
    // Prevent duplicates for same key+platform
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
      // Remove all current metrics for this platform
      const others = prev.filter(m => m.platform !== platform);
      // Re-add defaults
      const defaults = DEFAULT_METRICS_TEMPLATE.map(m => ({ ...m, platform }));
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
      dateRange,
      setDateRange,
      user,
      login,
      logout,
      metricsConfig,
      addMetric,
      removeMetric,
      resetMetrics
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