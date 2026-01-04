import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sun, Moon, Calendar, Menu } from 'lucide-react';
import { DateRangePicker } from '../Dashboard/DateRangePicker';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme, selectedPlatform } = useApp();
  
  const platformName = selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1) + ' Ads';

  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-6 py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md"
            onClick={onMenuClick}
          >
            <Menu size={20} />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {platformName}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 hidden md:block">
              Track changes and monitor performance impact.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DateRangePicker />
          
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};