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
import { dataService } from './services/dataService';
import { ChangeLog, DailyMetric, ImportRecord, Campaign } from './types';
import { Plus, Settings } from 'lucide-react';

const Dashboard = () => {
  const { selectedPlatform, dateRange, addCustomMetric, removeCustomMetric, customMetrics } = useApp();
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [logs, setLogs] = useState<ChangeLog[]>([]);
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);

  // Fetch data when params change
  const refreshData = async () => {
    setLoading(true);
    try {
      const [fetchedMetrics, fetchedLogs, fetchedImports, fetchedCampaigns] = await Promise.all([
        dataService.getMetrics(selectedPlatform, dateRange.start, dateRange.end),
        dataService.getChangeLogs(selectedPlatform, dateRange.start, dateRange.end),
        dataService.getImports(selectedPlatform),
        dataService.getCampaigns(selectedPlatform)
      ]);
      setMetrics(fetchedMetrics);
      setLogs(fetchedLogs);
      setImports(fetchedImports);
      setCampaigns(fetchedCampaigns);
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
      setLogs(prev => [newLog, ...prev].sort((a,b) => b.date.localeCompare(a.date)));
    }
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

  const handleAddCampaign = async (name: string) => {
    const newCampaign = await dataService.addCampaign(name, selectedPlatform);
    setCampaigns(prev => [...prev, newCampaign]);
  };

  const handleDeleteCampaign = async (id: string) => {
    await dataService.deleteCampaign(id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Row: Chart & Import */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card title="Performance Impact" className="h-full">
            <AnalyticsChart metrics={metrics} changeLogs={logs} isLoading={loading} />
          </Card>
        </div>
        <div className="space-y-6">
          <Card 
            title="Data Import" 
            action={
              <button 
                onClick={() => setIsMetricModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-500 transition-colors"
                title="Add Custom Metrics"
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
                 <p className="mb-1">Supported CSV columns:</p>
                 <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Date</code>,{' '}
                 <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Impressions</code>,{' '}
                 <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Clicks</code>,{' '}
                 <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Spend</code>,{' '}
                 <code className="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">Conversions</code>
                 {customMetrics.length > 0 && (
                   <>
                      <span className="mx-1">+</span>
                      {customMetrics.map(m => (
                        <span key={m.key} className="mr-1"><code className="bg-brand-50 dark:bg-brand-900/20 text-brand-600 px-1 py-0.5 rounded">{m.label}</code></span>
                      ))}
                   </>
                 )}
               </div>
             </div>
          </Card>
          
          {/* Quick Stats Summary */}
          {!loading && metrics.length > 0 && (
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                   <p className="text-xs text-slate-500 uppercase">Total Spend</p>
                   <p className="text-lg font-bold text-slate-900 dark:text-white">
                     ${metrics.reduce((acc, curr) => acc + curr.spend, 0).toLocaleString()}
                   </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                   <p className="text-xs text-slate-500 uppercase">Total Conv.</p>
                   <p className="text-lg font-bold text-slate-900 dark:text-white">
                     {metrics.reduce((acc, curr) => acc + curr.conversions, 0).toLocaleString()}
                   </p>
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Change Log */}
      <Card 
        title="Change Log" 
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setIsCampaignModalOpen(true)} className="hidden sm:flex">
              Campaigns
            </Button>
            <Button size="sm" icon={<Plus size={16} />} onClick={() => setIsLogModalOpen(true)}>
              Log Change
            </Button>
          </div>
        }
      >
        <ChangeLogTable logs={logs} onDelete={handleDeleteLog} isLoading={loading} />
      </Card>

      <AddChangeModal 
        isOpen={isLogModalOpen} 
        onClose={() => setIsLogModalOpen(false)} 
        onSubmit={handleAddLog}
        platform={selectedPlatform}
        campaigns={campaigns}
        onManageCampaigns={() => {
          setIsLogModalOpen(false); // Close log modal
          setIsCampaignModalOpen(true); // Open campaign modal
        }}
      />

      <DataManagementModal 
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        imports={imports}
        onDelete={handleDeleteImport}
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
        customMetrics={customMetrics}
        onAdd={addCustomMetric}
        onRemove={removeCustomMetric}
      />
    </div>
  );
};

const AppContent = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-900">
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