import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../UI/Button';
import { Platform, DailyMetric } from '../../types';

interface CsvUploaderProps {
  platform: Platform;
  onImport: (metrics: DailyMetric[], filename: string) => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ platform, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

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

        // Basic CSV Parsing logic
        // Try to identify headers or assume a generic structure
        // Assuming headers: Date, Impressions, Clicks, Spend, Conversions
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
        
        const dateIdx = getIndex(['date', 'day', 'time']);
        const impIdx = getIndex(['impression', 'views']);
        const clicksIdx = getIndex(['click']);
        const spendIdx = getIndex(['spend', 'cost', 'amount']);
        const convIdx = getIndex(['conversion']);

        // If we can't find at least a date, it's risky. But let's try.
        // If indices are -1, we might fall back to 0, 1, 2, 3, 4 positions
        const usePositions = dateIdx === -1 && impIdx === -1;

        const newMetrics: DailyMetric[] = [];

        // Skip header
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim());
          if (cols.length < 2) continue;

          let dateStr = usePositions ? cols[0] : cols[dateIdx];
          
          // Try to normalize date (Simple attempt)
          try {
            const dateObj = new Date(dateStr);
            if (!isNaN(dateObj.getTime())) {
              dateStr = dateObj.toISOString().split('T')[0];
            } else {
              continue; // Skip invalid dates
            }
          } catch (e) {
            continue;
          }

          const parseNum = (val: string) => {
            if (!val) return 0;
            return parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
          };

          const impressions = parseNum(usePositions ? cols[1] : cols[impIdx]);
          const clicks = parseNum(usePositions ? cols[2] : cols[clicksIdx]);
          const spend = parseNum(usePositions ? cols[3] : cols[spendIdx]);
          const conversions = parseNum(usePositions ? cols[4] : cols[convIdx]);

          newMetrics.push({
            date: dateStr,
            platform,
            impressions,
            clicks,
            spend,
            conversions
          });
        }

        if (newMetrics.length === 0) {
            throw new Error("No valid data rows found.");
        }

        // Simulate processing delay for UX
        setTimeout(() => {
          onImport(newMetrics, file.name);
          setStatus('success');
          setMessage(`Successfully imported ${newMetrics.length} rows.`);
          
          // Reset after 3 seconds
          setTimeout(() => {
            setStatus('idle');
            setMessage('');
            if(fileInputRef.current) fileInputRef.current.value = '';
          }, 3000);
        }, 1000);

      } catch (err) {
        setStatus('error');
        setMessage('Failed to parse CSV. Ensure headers include Date, Impressions, Clicks, Spend.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-center">
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
          <p className="text-xs text-slate-500 mb-3">LinkedIn, Google, or Meta exports</p>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            Select File
          </Button>
        </>
      )}

      {status === 'parsing' && (
        <div className="flex flex-col items-center">
           <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-2"></div>
           <p className="text-xs text-slate-500">Processing...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center text-green-600 dark:text-green-400">
           <CheckCircle size={24} className="mb-1" />
           <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center text-red-500">
           <AlertCircle size={24} className="mb-1" />
           <p className="text-sm font-medium">Error</p>
           <p className="text-xs opacity-80">{message}</p>
           <button onClick={() => setStatus('idle')} className="mt-2 text-xs underline">Try Again</button>
        </div>
      )}
    </div>
  );
};