import React from 'react';
import { ChangeLog } from '../../types';
import { Trash2, Tag, Edit2 } from 'lucide-react';

interface ChangeLogTableProps {
  logs: ChangeLog[];
  onDelete: (id: string) => void;
  onEdit: (log: ChangeLog) => void;
  isLoading: boolean;
}

export const ChangeLogTable: React.FC<ChangeLogTableProps> = ({ logs, onDelete, onEdit, isLoading }) => {
  if (isLoading) {
    return <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
    </div>;
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>No changes logged for this period.</p>
        <p className="text-sm">Log a change to see it on the graph.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="space-y-3">
        {logs.map((log) => {
          const dateObj = new Date(log.date);
          return (
            <div 
              key={log.id} 
              className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md transition-all duration-200"
            >
              {/* Date Block: Day, Month, Year */}
              <div className="flex-shrink-0 flex sm:flex-col items-center justify-center gap-2 sm:gap-0 sm:w-16 text-slate-500 dark:text-slate-400">
                <span className="text-xl font-bold text-slate-800 dark:text-slate-200 leading-none">{dateObj.getDate()}</span>
                <span className="text-xs font-semibold uppercase leading-tight">{dateObj.toLocaleString('en-GB', { month: 'short' })}</span>
                <span className="text-[10px] leading-tight opacity-75">{dateObj.getFullYear()}</span>
              </div>

              {/* Content */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 text-xs font-bold uppercase tracking-wide">
                    {log.changeType}
                  </span>
                  <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                    {log.campaignName}
                  </h4>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                  {log.description}
                </p>
                
                {log.tags && log.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <Tag size={12} className="text-slate-400" />
                    <div className="flex gap-1">
                      {log.tags.map((tag, idx) => (
                        <span key={idx} className="text-xs text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(log)}
                  className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                  title="Edit Log"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDelete(log.id)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete Log"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};