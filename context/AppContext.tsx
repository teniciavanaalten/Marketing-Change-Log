import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, DateRange, User, MetricDefinition } from '../types';

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  selectedPlatform: Platform;
  setSelectedPlatform: (p: Platform) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  user: User | null;
  login: () => void;
  logout: () => void;
  customMetrics: MetricDefinition[];
  addCustomMetric: (metric: MetricDefinition) => void;
  removeCustomMetric: (key: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('linkedin');
  const [user, setUser] = useState<User | null>({ id: '1', name: 'Demo Marketer', email: 'demo@marketer.io' });
  const [customMetrics, setCustomMetrics] = useState<MetricDefinition[]>([]);
  
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

  const addCustomMetric = (metric: MetricDefinition) => {
    setCustomMetrics(prev => [...prev, metric]);
  };

  const removeCustomMetric = (key: string) => {
    setCustomMetrics(prev => prev.filter(m => m.key !== key));
  };

  return (
    <AppContext.Provider value={{
      theme,
      toggleTheme,
      selectedPlatform,
      setSelectedPlatform,
      dateRange,
      setDateRange,
      user,
      login,
      logout,
      customMetrics,
      addCustomMetric,
      removeCustomMetric
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