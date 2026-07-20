import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { Card } from './components/UI/Card';
import { Button } from './components/UI/Button';
import { AnalyticsChart } from './components/Dashboard/AnalyticsChart';
import { ChangeLogTable } from './components/Dashboard/ChangeLogTable';
import { AddChangeModal } from './components/Dashboard/AddChangeModal';
import { CsvUploader } from './components/Dashboard/CsvUploader';
import { DataManagementModal } from './components/Dashboard/DataManagementModal';
import { CampaignManagerModal } from './components/Dashboard/CampaignManagerModal';
import { MetricManagerModal } from './components/Dashboard/MetricManagerModal';
import { ChangeTypeManagerModal } from './components/Dashboard/ChangeTypeManagerModal';
import { dataService } from './services/dataService';
import { ChangeLog, DailyMetric, ImportRecord } from './types';
import { MASTER_VIEW_ID } from './constants';
import { Plus, Settings } from 'lucide-react';

const Dashboard = () => {
  const {
    selectedPlatform,
    dateRange,
    addMetric,
    removeMetric,
    metricsConfig,
    campaigns,
    selectedCampaignId,
    refreshCampaigns,
    changeTypesConfig,
    addChangeType,
    removeChangeType,
    platforms,
    resetConfigToDefaults
  } = useApp();

  const isMasterView = selectedPlatform === MASTER_VIEW_ID;

  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ChangeLog | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);
  const [isChangeTypeModalOpen, setIsChangeTypeModalOpen] = useState(false);

  // Fetch data when params change
  const refreshData = async () => {
    setLoading(true);
    try {
      const [fetchedMetrics, fetchedLogs, fetchedImports] = await Promise.all([
        dataService.getMetrics(selectedPlatform, dateRange.start, dateRange.end),
        dataService.getChangeLogs(selectedPlatform, dateRange.start, dateRange.end),
        dataService.getImports(selectedPlatform)
      ]);
      setMetrics(fetchedMetrics);
      setLogs(fetchedLogs);
      setImports(fetchedImports);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedPlatform, dateRange]);

  const handleAddLog = async (logData: any) => {
    const newLog = await dataService.addChangeLog(logData);
    if (newLog.date >= dateRange.start && newLog.date <= dateRange.end) {
      setLogs(prev => [newLog, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    }
  };

  const handleUpdateLog = async (id: string, logData: Omit<ChangeLog, 'id'>) => {
    const updatedLog = await dataService.updateChangeLog(id, logData);
    setLogs(prev =>
      prev
        .map(l => (l.id === id ? updatedLog : l))
        .filter(l => l.date >= dateRange.start && l.date <= dateRange.end)
        .sort((a, b) => b.date.localeCompare(a.date))
    );
  };

  const handleEditLog = (log: ChangeLog) => {
    setEditingLog(log);
    setIsLogModalOpen(true);
  };

  const handleDeleteLog = async (id: string) => {
    await dataService.deleteChangeLog(id);
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const handleImportMetrics = async (newMetrics: DailyMetric[], filename: string) => {
    await dataService.importMetrics(newMetrics, filename);
    await refreshData();
  };

  const handleDeleteImport = async (id: string) => {
    await dataService.deleteImport(id);
    await refreshData();
  };

  // Clears all melon storage, re-seeds the demo dataset, refreshes the UI
  const handleResetDemo = async () => {
    await dataService.resetToDemo();
    resetConfigToDefaults();
    await refreshData();
    await refreshCampaigns();
  };

  // Clears all melon storage and data; config back to defaults, refreshes the UI
  const handleClearAll = async () => {
    await dataService.clearAllData();
    resetConfigToDefaults();
    await refreshData();
    await refreshCampaigns();
  };

  const handleAddCampaign = async (name: string) => {
    await dataService.addCampaign(name, selectedPlatform);
    await refreshCampaigns(); // Update global context
  };

  const handleDeleteCampaign = async (id: string) => {
    await dataService.deleteCampaign(id);
    await refreshCampaigns(); // Update global context
  };

  // Filter logic (campaign filtering does not apply in the master view)
  const selectedCampaignName = !isMasterView && selectedCampaignId
    ? campaigns.find(c => c.id === selectedCampaignId)?.name
    : null;

  const filteredMetrics = selectedCampaignName
    ? metrics.filter(m => m.campaignName === selectedCampaignName)
    : metrics;

  const filteredLogs = selectedCampaignName
    ? logs.filter(l => l.campaignName === selectedCampaignName)
    : logs;

  // Filter metrics for display in the uploader hint
  // Only show non-derived ones (imported from CSV)
  const activeMetrics = metricsConfig.filter(m => m.platform === selectedPlatform && !m.isDerived);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Row: Chart & Import */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card
            title={selectedCampaignName ? `Performance: ${selectedCampaignName}` : "Performance Impact"}
            className="h-full"
          >
            <AnalyticsChart metrics={filteredMetrics} changeLogs={filteredLogs} isLoading={loading} />
          </Card>
        </div>
        <div className="space-y-6">
          {/* Uploads are platform-specific: hidden in the master Cockpit view */}
          {!isMasterView && (
          <Card
            title="Data Import"
            action={
              <button
                onClick={() => setIsMetricModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-500 transition-colors"
                title="Manage Metrics"
              >
                <Settings size={14} />
                <span>Configure Metrics</span>
              </button>
            }
          >
            <div className="space-y-4">
              <CsvUploader
                platform={selectedPlatform}
                onImport={handleImportMetrics}
                defaultCampaignName={selectedCampaignName || undefined}
              />

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Recent Imports: {imports.length}</span>
                <button
                  onClick={() => setIsDataModalOpen(true)}
                  className="text-brand-500 hover:text-brand-600 font-medium hover:underline"
                >
                  Manage Data
                </button>
              </div>

              <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
                <p className="mb-1">Active CSV Columns ({selectedPlatform}):</p>
                <div className="flex flex-wrap gap-1.5">
                  <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Date</code>
                  {activeMetrics.map(m => (
                    <code key={m.key} className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      {m.label}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          )}

          {/* Quick Stats Summary (per-platform view) */}
          {!isMasterView && !loading && filteredMetrics.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 uppercase">Total Spend</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  ${filteredMetrics.reduce((acc, curr) => acc + curr.spend, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 uppercase">Total Conv.</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {filteredMetrics.reduce((acc, curr) => acc + curr.conversions, 0).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Master view: totals across all platforms + per-platform breakdown */}
          {isMasterView && !loading && metrics.length > 0 && (() => {
            const totalSpend = metrics.reduce((acc, m) => acc + m.spend, 0);
            const totalConversions = metrics.reduce((acc, m) => acc + m.conversions, 0);
            const totalClicks = metrics.reduce((acc, m) => acc + m.clicks, 0);

            return (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 uppercase">Total Spend</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      ${totalSpend.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 uppercase">Total Conv.</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {totalConversions.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 uppercase">Total Clicks</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {totalClicks.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 uppercase">Blended CPA</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {totalConversions > 0 ? `$${(totalSpend / totalConversions).toFixed(2)}` : '—'}
                    </p>
                  </div>
                </div>

                <Card title="By Platform">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] text-slate-400 uppercase text-left">
                        <th className="pb-2 font-semibold">Platform</th>
                        <th className="pb-2 font-semibold text-right">Spend</th>
                        <th className="pb-2 font-semibold text-right">Conv.</th>
                        <th className="pb-2 font-semibold text-right">CPA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platforms.map(p => {
                        const rows = metrics.filter(m => m.platform === p.id);
                        const spend = rows.reduce((acc, m) => acc + m.spend, 0);
                        const conv = rows.reduce((acc, m) => acc + m.conversions, 0);
                        return (
                          <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700">
                            <td className="py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: p.color }}
                                ></span>
                                <span className="text-slate-700 dark:text-slate-300 truncate">{p.label}</span>
                              </div>
                            </td>
                            <td className="py-2 text-right font-medium text-slate-900 dark:text-white">
                              ${spend.toLocaleString()}
                            </td>
                            <td className="py-2 text-right font-medium text-slate-900 dark:text-white">
                              {conv.toLocaleString()}
                            </td>
                            <td className="py-2 text-right font-medium text-slate-900 dark:text-white">
                              {conv > 0 ? `$${(spend / conv).toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              </>
            );
          })()}
        </div>
      </div>

      {/* Bottom Row: Change Log */}
      <Card
        title={selectedCampaignName ? `Change Log: ${selectedCampaignName}` : "Change Log"}
        action={
          // Logging changes and managing campaigns are platform-specific:
          // hidden in the master Cockpit view
          !isMasterView ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsCampaignModalOpen(true)} className="hidden sm:flex">
                Campaigns
              </Button>
              <Button size="sm" icon={<Plus size={16} />} onClick={() => { setEditingLog(null); setIsLogModalOpen(true); }}>
                Log Change
              </Button>
            </div>
          ) : undefined
        }
      >
        <ChangeLogTable logs={filteredLogs} onDelete={handleDeleteLog} onEdit={handleEditLog} isLoading={loading} showPlatform={isMasterView} />
      </Card>

      <AddChangeModal
        isOpen={isLogModalOpen}
        onClose={() => { setIsLogModalOpen(false); setEditingLog(null); }}
        onSubmit={(logData) => editingLog ? handleUpdateLog(editingLog.id, logData) : handleAddLog(logData)}
        editingLog={editingLog}
        platform={selectedPlatform}
        campaigns={campaigns} // Pass global campaigns
        onManageCampaigns={() => {
          setIsLogModalOpen(false); // Close log modal
          setIsCampaignModalOpen(true); // Open campaign modal
        }}
        changeTypes={changeTypesConfig.filter(ct => ct.platform === (editingLog ? editingLog.platform : selectedPlatform))}
        onManageChangeTypes={() => {
          setIsLogModalOpen(false); // Close log modal
          setIsChangeTypeModalOpen(true); // Open change type modal
        }}
      />

      <DataManagementModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        imports={imports}
        onDelete={handleDeleteImport}
        onResetDemo={handleResetDemo}
        onClearAll={handleClearAll}
      />

      <CampaignManagerModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        campaigns={campaigns}
        platform={selectedPlatform}
        onAdd={handleAddCampaign}
        onDelete={handleDeleteCampaign}
      />

      <MetricManagerModal
        isOpen={isMetricModalOpen}
        onClose={() => setIsMetricModalOpen(false)}
        customMetrics={metricsConfig} // Pass full config
        platform={selectedPlatform}
        onAdd={addMetric}
        onRemove={removeMetric}
      />

      <ChangeTypeManagerModal
        isOpen={isChangeTypeModalOpen}
        onClose={() => setIsChangeTypeModalOpen(false)}
        changeTypes={changeTypesConfig}
        platform={selectedPlatform}
        onAdd={addChangeType}
        onRemove={removeChangeType}
      />
    </div>
  );
};

const AppContent = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-cream-50 dark:bg-slate-900">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-cream-50 dark:bg-slate-900">
          <Dashboard />
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return <AppProvider children={<AppContent />} />;
};

export default App;