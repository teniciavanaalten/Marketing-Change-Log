import React, { useState } from 'react';
import { X, Plus, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '../UI/Button';
import { ChangeTypeDefinition, Platform } from '../../types';
import { useApp } from '../../context/AppContext';

interface ChangeTypeManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    changeTypes: ChangeTypeDefinition[];
    platform: Platform;
    onAdd: (changeType: ChangeTypeDefinition) => void;
    onRemove: (id: string, platform: Platform) => void;
}

export const ChangeTypeManagerModal: React.FC<ChangeTypeManagerModalProps> = ({
    isOpen,
    onClose,
    changeTypes: allChangeTypes,
    platform,
    onAdd,
    onRemove
}) => {
    const { resetChangeTypes } = useApp();
    const [newLabel, setNewLabel] = useState('');

    if (!isOpen) return null;

    // Filter change types for display
    const platformChangeTypes = allChangeTypes.filter(ct => ct.platform === platform);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLabel) return;

        // Generate a safe id from label (e.g. "A/B Test" -> "a-b-test")
        const id = newLabel.toLowerCase().replace(/[^a-z0-9]/g, '-');

        onAdd({
            id,
            label: newLabel,
            platform: platform
        });

        setNewLabel('');
    };

    const handleReset = () => {
        if (window.confirm(`Are you sure you want to reset ${platform} change types to default?`)) {
            resetChangeTypes(platform);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Manage Change Types</h2>
                        <p className="text-xs text-slate-500 capitalize">{platform} Ads</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Add Form */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">Add Custom {platform} Change Type</h3>
                        <form onSubmit={handleAdd} className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">
                                    Change Type Label
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. A/B Test Started"
                                    value={newLabel}
                                    onChange={e => setNewLabel(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500"
                                    required
                                />
                            </div>

                            <div className="pt-2">
                                <Button type="submit" size="sm" icon={<Plus size={14} />} className="w-full">
                                    Add Change Type
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* List */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Active Change Types ({platformChangeTypes.length})</h3>
                            <button
                                onClick={handleReset}
                                className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1"
                                type="button"
                            >
                                <RotateCcw size={12} /> Reset Defaults
                            </button>
                        </div>

                        {platformChangeTypes.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No change types configured. Add one or reset defaults.</p>
                        ) : (
                            <div className="space-y-2">
                                {platformChangeTypes.map(changeType => (
                                    <div key={changeType.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg group">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{changeType.label}</p>
                                            <p className="text-xs text-slate-500">ID: {changeType.id}</p>
                                        </div>
                                        <button
                                            onClick={() => onRemove(changeType.id, platform)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                            title="Remove Change Type"
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
