import React from 'react';
import { useApp } from '../../context/AppContext';
import { Calendar } from 'lucide-react';

export const DateRangePicker: React.FC = () => {
  const { dateRange, setDateRange } = useApp();

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
      <div className="hidden sm:flex gap-1">
        {[7, 30, 90].map(days => (
          <button
            key={days}
            onClick={() => handlePreset(days)}
            className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shadow-sm"
          >
            {days}D
          </button>
        ))}
      </div>
      
      <div className="flex items-center gap-2 px-2 border-l border-slate-200 dark:border-slate-700 ml-1">
        <Calendar size={14} className="text-slate-500" />
        <input 
          type="date" 
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none w-24"
        />
        <span className="text-slate-400">-</span>
        <input 
          type="date" 
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none w-24"
        />
      </div>
    </div>
  );
};