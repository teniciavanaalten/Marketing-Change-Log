import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../UI/Button';
import { Platform, DailyMetric } from '../../types';
import { useApp } from '../../context/AppContext';

interface CsvUploaderProps {
  platform: Platform;
  onImport: (metrics: DailyMetric[], filename: string) => void;
  defaultCampaignName?: string;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ platform, onImport, defaultCampaignName }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { metricsConfig } = useApp();
  const [status, setStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Split a single CSV line into fields, handling quoted fields that
  // contain commas and escaped double quotes ("").
  const parseCsvLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"') {
          if (line[i + 1] === '"') {
            current += '"'; // Escaped quote
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  };

  // Helper to parse various date formats
  const parseDate = (rawDate: string): string | null => {
    if (!rawDate) return null;
    const str = rawDate.trim();

    // 1. ISO Format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // 2. Slash/Dash Formats (DD/MM/YYYY or MM/DD/YYYY)
    const match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (match) {
      const p1 = parseInt(match[1], 10);
      const p2 = parseInt(match[2], 10);
      let year = parseInt(match[3], 10);
      if (year < 100) year += 2000;

      if (p1 > 12) {
        return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      }
      if (p2 > 12) {
        return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
      }
      // Default to DD/MM/YYYY
      return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }

    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('parsing');
    setMessage('Reading file...');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        if (lines.length < 2) throw new Error("File appears empty");

        const headers = parseCsvLine(lines[0].toLowerCase());
        const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h === k || h.includes(k)));

        // Always look for Date
        const dateIdx = getIndex(['date', 'day', 'time', 'period']);

        // Look for Campaign Name
        const campaignIdx = getIndex(['campaign', 'campaign name', 'campaign_name']);

        // Get active non-derived metrics for this platform
        const activeMetrics = metricsConfig.filter(m => m.platform === platform && !m.isDerived);

        // Map metric keys to CSV indices dynamically
        const metricIndices = activeMetrics.map(m => {
          // Heuristic for matching headers: try exact label, or key, or common synonyms
          let searchTerms = [m.label.toLowerCase(), m.key.toLowerCase()];
          if (m.key === 'impressions') searchTerms.push('views', 'imps', 'impr');
          if (m.key === 'spend') searchTerms.push('cost', 'amount');
          if (m.key === 'conversions') searchTerms.push('conv', 'leads');

          return {
            key: m.key,
            index: getIndex(searchTerms)
          };
        });

        // Determine if date is in first column by default if not found
        const useFirstColDate = dateIdx === -1;

        const newMetrics: DailyMetric[] = [];
        let skippedRows = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          if (cols.length < 2) continue;

          let rawDate = useFirstColDate ? cols[0] : cols[dateIdx];
          const validDate = parseDate(rawDate);

          if (!validDate) {
            skippedRows++;
            continue;
          }

          const parseNum = (val: string) => {
            if (!val) return 0;
            return parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;
          };

          // Determine Campaign Name
          // 1. From CSV row
          // 2. From defaultCampaignName prop (e.g. current selected campaign)
          // 3. Undefined (Platform total / Unassigned)
          let rowCampaignName = campaignIdx > -1 ? cols[campaignIdx] : undefined;

          // If CSV has empty campaign cell, fall back or keep empty string?
          if (rowCampaignName === '') rowCampaignName = undefined;

          // If no campaign in row, use default
          if (!rowCampaignName && defaultCampaignName) {
            rowCampaignName = defaultCampaignName;
          }

          // Build metric object dynamically
          const metric: any = {
            date: validDate,
            platform,
            campaignName: rowCampaignName,
            customMetrics: {} // Initialize for safety
          };

          // Standard storage keys for compatibility
          // If the key is standard (spend, clicks, etc), store it at root
          // Else store in customMetrics
          metricIndices.forEach(({ key, index }) => {
            const val = index > -1 ? parseNum(cols[index]) : 0;

            if (['impressions', 'clicks', 'spend', 'conversions'].includes(key)) {
              metric[key] = val;
            } else {
              metric.customMetrics[key] = val;
            }
          });

          // Ensure standard keys exist even if 0, to satisfy TypeScript/Interface
          metric.impressions = metric.impressions || 0;
          metric.clicks = metric.clicks || 0;
          metric.spend = metric.spend || 0;
          metric.conversions = metric.conversions || 0;

          newMetrics.push(metric as DailyMetric);
        }

        if (newMetrics.length === 0) {
          throw new Error("No valid data rows found. Please check date format.");
        }

        setTimeout(() => {
          onImport(newMetrics, file.name);
          setStatus('success');
          setMessage(`Successfully imported ${newMetrics.length} rows.${skippedRows > 0 ? ` (${skippedRows} skipped)` : ''}`);

          setTimeout(() => {
            setStatus('idle');
            setMessage('');
            if (fileInputRef.current) fileInputRef.current.value = '';
          }, 3000);
        }, 1000);

      } catch (err) {
        setStatus('error');
        setMessage('Failed to parse CSV. Check your columns.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-center transition-colors relative">
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {status === 'idle' && (
        <>
          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mb-2 text-slate-500">
            <Upload size={20} />
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">Import Metrics CSV</p>
          <p className="text-xs text-slate-500 mb-3">DD/MM/YYYY or YYYY-MM-DD</p>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            Select File
          </Button>
        </>
      )}

      {status === 'parsing' && (
        <div className="flex flex-col items-center py-2">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs text-slate-500">Processing file...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center text-green-600 dark:text-green-400 py-1">
          <CheckCircle size={24} className="mb-1" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center text-red-500 py-1">
          <AlertCircle size={24} className="mb-1" />
          <p className="text-sm font-medium">Import Failed</p>
          <p className="text-xs opacity-80 max-w-[200px]">{message}</p>
          <button onClick={() => setStatus('idle')} className="mt-2 text-xs underline hover:text-red-600">Try Again</button>
        </div>
      )}
    </div>
  );
};