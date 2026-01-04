import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../UI/Button';
import { MetricDefinition } from '../../types';

interface MetricManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customMetrics: MetricDefinition[];
  onAdd: (metric: MetricDefinition) => void;
  onRemove: (key: string) => void;
}

export const MetricManagerModal: React.FC<MetricManagerModalProps> = ({
  isOpen,
  onClose,
  customMetrics,
  onAdd,
  onRemove
}) => {
  const [newMetric, setNewMetric] = useState<{
    label: string;
    format: 'number' | 'currency' | 'percent';
    aggregation: 'sum' | 'average';
  }>({
    label: '',
    format: 'number',
    aggregation: 'sum'
  });

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMetric.label) return;

    // Generate a safe key from label (e.g. "Video Views" -> "video_views")
    const key = newMetric.label.toLowerCase().replace(/[^a-z0-9]/g, '_');

    onAdd({
      key,
      label: newMetric.label,
      format: newMetric.format,
      aggregation: newMetric.aggregation
    });

    setNewMetric({ label: '', format: 'number', aggregation: 'sum' });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Custom Metrics</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Add Form */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Add New Metric</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Metric Name (must match CSV column)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. Video Views"
                  value={newMetric.label}
                  onChange={e => setNewMetric({...newMetric, label: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Format</label>
                  <select
                    value={newMetric.format}
                    onChange={e => setNewMetric({...newMetric, format: e.target.value as any})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="number">Number (1,234)</option>
                    <option value="currency">Currency ($1.00)</option>
                    <option value="percent">Percent (50%)</option>
                  </select>
                </div>
                <div>
                   <label className="block text-xs font-medium text-slate-500 mb-1">Aggregation</label>
                   <select
                    value={newMetric.aggregation}
                    onChange={e => setNewMetric({...newMetric, aggregation: e.target.value as any})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="sum">Sum (Total)</option>
                    <option value="average">Average (Mean)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" icon={<Plus size={14} />} className="w-full">
                  Add Metric
                </Button>
              </div>
            </form>
          </div>

          {/* List */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Active Custom Metrics</h3>
            {customMetrics.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No custom metrics added yet.</p>
            ) : (
              <div className="space-y-2">
                {customMetrics.map(metric => (
                  <div key={metric.key} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{metric.label}</p>
                      <div className="flex gap-2 text-[10px] text-slate-500 uppercase font-semibold">
                        <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{metric.format}</span>
                        <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{metric.aggregation}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onRemove(metric.key)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove Metric"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};