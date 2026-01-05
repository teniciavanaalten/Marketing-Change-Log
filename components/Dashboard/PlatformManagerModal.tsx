import React, { useState } from 'react';
import { X, Trash2, Plus, Smile } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../UI/Button';

interface PlatformManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlatformManagerModal: React.FC<PlatformManagerModalProps> = ({ isOpen, onClose }) => {
  const { platforms, addPlatform, removePlatform } = useApp();
  const [newPlatform, setNewPlatform] = useState({
    label: '',
    emoji: '',
    color: '#e84661'
  });

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlatform.label) return;

    addPlatform({
      label: newPlatform.label,
      emoji: newPlatform.emoji,
      color: newPlatform.color
    });

    setNewPlatform({ label: '', emoji: '', color: '#e84661' });
  };

  const handleDelete = (id: string, label: string) => {
    if (window.confirm(`Delete ${label}? This will remove it from your sidebar.`)) {
      removePlatform(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Manage Platforms</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Add Form */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Add Custom Platform</h3>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Platform Name
                </label>
                <input 
                  type="text"
                  placeholder="e.g. TikTok Ads"
                  value={newPlatform.label}
                  onChange={e => setNewPlatform({...newPlatform, label: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Emoji (Icon)
                  </label>
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Smile size={14} className="text-slate-400" />
                     </div>
                     <input 
                      type="text"
                      placeholder="🎵"
                      maxLength={2}
                      value={newPlatform.emoji}
                      onChange={e => setNewPlatform({...newPlatform, emoji: e.target.value})}
                      className="w-full pl-9 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Theme Color
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={newPlatform.color}
                      onChange={e => setNewPlatform({...newPlatform, color: e.target.value})}
                      className="h-9 w-12 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <div className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs text-slate-500 flex items-center">
                       {newPlatform.color}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" icon={<Plus size={14} />} className="w-full">
                  Create Platform
                </Button>
              </div>
            </form>
          </div>

          {/* List */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Your Platforms</h3>
            <div className="space-y-2">
              {platforms.map(platform => (
                <div key={platform.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg group">
                  <div className="flex items-center gap-3">
                    <span className="text-lg w-6 text-center">
                      {platform.emoji || '📱'}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{platform.label}</p>
                      <p className="text-[10px] text-slate-400">ID: {platform.id}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(platform.id, platform.label)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors opacity-50 group-hover:opacity-100"
                    title="Delete Platform"
                    disabled={platforms.length <= 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};