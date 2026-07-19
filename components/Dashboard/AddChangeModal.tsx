import React, { useState, useEffect } from 'react';
import { X, Plus, Settings } from 'lucide-react';
import { ChangeLog, Platform, Campaign, ChangeTypeDefinition } from '../../types';
import { Button } from '../UI/Button';

interface AddChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (log: Omit<ChangeLog, 'id'>) => void;
  platform: Platform;
  campaigns: Campaign[];
  onManageCampaigns: () => void;
  changeTypes: ChangeTypeDefinition[];
  onManageChangeTypes: () => void;
  editingLog?: ChangeLog | null; // When set, the modal edits this log instead of creating a new one
}

export const AddChangeModal: React.FC<AddChangeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  platform,
  campaigns,
  onManageCampaigns,
  changeTypes,
  onManageChangeTypes,
  editingLog = null
}) => {
  const [formData, setFormData] = useState({
    campaignName: '',
    changeType: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    tags: ''
  });

  const isEditMode = !!editingLog;

  // Pre-fill the form when opening in edit mode; reset when opening in add mode
  useEffect(() => {
    if (!isOpen) return;
    if (editingLog) {
      setFormData({
        campaignName: editingLog.campaignName,
        changeType: editingLog.changeType,
        description: editingLog.description,
        date: editingLog.date,
        tags: editingLog.tags.join(', ')
      });
    } else {
      setFormData({
        campaignName: '',
        changeType: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        tags: ''
      });
    }
  }, [isOpen, editingLog]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      // When editing, keep the log's original platform (the modal may be opened
      // from the master Cockpit view, where `platform` is not a real platform)
      platform: editingLog ? editingLog.platform : platform,
      campaignName: formData.campaignName,
      changeType: formData.changeType,
      description: formData.description,
      date: formData.date,
      tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    });
    onClose();
    // Reset form
    setFormData({
      campaignName: '',
      changeType: changeTypes.length > 0 ? changeTypes[0].label : '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      tags: ''
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isEditMode ? 'Edit Change' : 'Log New Change'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-500">Type</label>
                <button
                  type="button"
                  onClick={onManageChangeTypes}
                  className="text-[10px] text-brand-500 hover:underline flex items-center gap-1 font-medium"
                >
                  <Settings size={10} /> Manage List
                </button>
              </div>
              <select
                value={formData.changeType}
                onChange={e => setFormData({ ...formData, changeType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                required
              >
                {changeTypes.length === 0 ? (
                  <option value="">No change types available</option>
                ) : (
                  changeTypes.map(ct => (
                    <option key={ct.id} value={ct.label}>{ct.label}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-slate-500">Campaign</label>
              <button
                type="button"
                onClick={onManageCampaigns}
                className="text-[10px] text-brand-500 hover:underline flex items-center gap-1 font-medium"
              >
                <Settings size={10} /> Manage List
              </button>
            </div>
            <input
              type="text"
              list="campaigns-list"
              required
              placeholder="e.g. Summer Sale 2024"
              value={formData.campaignName}
              onChange={e => setFormData({ ...formData, campaignName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              autoComplete="off"
            />
            <datalist id="campaigns-list">
              {campaigns.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <textarea
              required
              rows={3}
              placeholder="What specifically changed? (e.g. Increased daily budget to $500)"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              placeholder="budget, scale, optimization"
              value={formData.tags}
              onChange={e => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditMode ? 'Update Change' : 'Save Change'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};