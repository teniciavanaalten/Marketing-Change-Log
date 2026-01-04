import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform, DateRange, User } from '../types';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('linkedin');
  const [user, setUser] = useState<User | null>({ id: '1', name: 'Demo Marketer', email: 'demo@marketer.io' });
  
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
      logout
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