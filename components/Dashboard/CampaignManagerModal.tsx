import React, { useState } from 'react';
import { X, Trash2, Plus, Target } from 'lucide-react';
import { Campaign, Platform } from '../../types';
import { Button } from '../UI/Button';

interface CampaignManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: Campaign[];
  platform: Platform;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
}

export const CampaignManagerModal: React.FC<CampaignManagerModalProps> = ({ 
  isOpen, 
  onClose, 
  campaigns, 
  platform,
  onAdd, 
  onDelete 
}) => {
  const [newCampaignName, setNewCampaignName] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCampaignName.trim()) {
      onAdd(newCampaignName.trim());
      setNewCampaignName('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">Manage {platform} Campaigns</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Add Form */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter campaign name..."
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
              autoFocus
            />
            <Button type="submit" size="sm" icon={<Plus size={16} />}>
              Add
            </Button>
          </form>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1">
          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Target size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No campaigns saved yet.</p>
              <p className="text-xs mt-1">Add one above to make selection easier.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <div 
                  key={campaign.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-4">
                    {campaign.name}
                  </span>
                  
                  <button 
                    onClick={() => onDelete(campaign.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Delete Campaign"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 text-xs text-center text-slate-400 border-t border-slate-100 dark:border-slate-700">
           These campaigns will appear in the autocomplete list when logging changes.
        </div>
      </div>
    </div>
  );
};