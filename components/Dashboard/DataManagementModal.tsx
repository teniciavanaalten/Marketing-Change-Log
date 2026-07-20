import React, { useState } from 'react';
import { X, Trash2, FileText, Calendar, RotateCcw, Eraser } from 'lucide-react';
import { ImportRecord } from '../../types';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  imports: ImportRecord[];
  onDelete: (id: string) => void;
  onResetDemo: () => Promise<void>;
  onClearAll: () => Promise<void>;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({ isOpen, onClose, imports, onDelete, onResetDemo, onClearAll }) => {
  // Two-step inline confirm (no browser confirm() dialog)
  const [confirm, setConfirm] = useState<null | 'demo' | 'clear'>(null);
  const [busy, setBusy] = useState(false);

  const run = async (which: 'demo' | 'clear') => {
    if (confirm !== which) {
      setConfirm(which);
      return;
    }
    setBusy(true);
    try {
      await (which === 'demo' ? onResetDemo() : onClearAll());
    } finally {
      setBusy(false);
      setConfirm(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Manage Imported Data</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {imports.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p>No files imported yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {imports.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-500">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white break-all">{record.filename}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(record.importDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span>•</span>
                        <span>{record.rowCount} rows</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => onDelete(record.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete Import"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0 space-y-3">
          <p className="text-xs text-slate-500">
            Deleting an import will remove all metrics associated with that file from your analytics graphs.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
            <button
              onClick={() => run('demo')}
              disabled={busy}
              onMouseLeave={() => confirm === 'demo' && setConfirm(null)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50
                ${confirm === 'demo'
                  ? 'bg-brand-500 text-white hover:bg-brand-600'
                  : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-brand-500'
                }`}
            >
              <RotateCcw size={14} />
              {confirm === 'demo' ? 'Klik nogmaals om te bevestigen' : 'Reset naar demo'}
            </button>

            <button
              onClick={() => run('clear')}
              disabled={busy}
              onMouseLeave={() => confirm === 'clear' && setConfirm(null)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50
                ${confirm === 'clear'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-red-500'
                }`}
            >
              <Eraser size={14} />
              {confirm === 'clear' ? 'Klik nogmaals om te bevestigen' : 'Wis alle data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};