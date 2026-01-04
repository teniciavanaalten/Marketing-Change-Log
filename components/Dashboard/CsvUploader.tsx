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

  // Helper to parse various date formats
  const parseDate = (rawDate: string): string | null => {
    if (!rawDate) return null;
    const str = rawDate.trim();

    // 1. ISO Format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }

    // 2. Slash/Dash Formats (DD/MM/YYYY or MM/DD/YYYY)
    // Regex matches: part1 separator part2 separator part3
    const match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (match) {
      const p1 = parseInt(match[1], 10);
      const p2 = parseInt(match[2], 10);
      let year = parseInt(match[3], 10);

      // Handle 2-digit years (e.g., 23 -> 2023)
      if (year < 100) year += 2000;

      // Heuristic for DD/MM vs MM/DD
      // If p1 > 12, it must be Day (Day/Month/Year)
      if (p1 > 12) {
        return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
      }
      
      // If p2 > 12, it must be Day (Month/Day/Year) - rare but possible in US csvs
      if (p2 > 12) {
        return `${year}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
      }

      // Ambiguous case (e.g. 05/06/2023)
      // Default to DD/MM/YYYY as user requested "Day, Month, Year" formatting in UI
      return `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }

    // 3. Fallback to JS Date parser (handles "Oct 25, 2023", etc.)
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

        // Basic CSV Parsing logic
        // Try to identify headers or assume a generic structure
        // Assuming headers: Date, Impressions, Clicks, Spend, Conversions
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));
        
        const dateIdx = getIndex(['date', 'day', 'time', 'period']);
        const impIdx = getIndex(['impression', 'views', 'imps']);
        const clicksIdx = getIndex(['click']);
        const spendIdx = getIndex(['spend', 'cost', 'amount', 'avg. cpc']); // avg cpc often in cost column in some exports, need caution. Better 'spend' or 'cost'
        const convIdx = getIndex(['conversion', 'conv.']);

        // If we can't find at least a date, it's risky. But let's try.
        // If indices are -1, we might fall back to 0, 1, 2, 3, 4 positions
        const usePositions = dateIdx === -1 && impIdx === -1;

        const newMetrics: DailyMetric[] = [];
        let skippedRows = 0;

        // Skip header
        for (let i = 1; i < lines.length; i++) {
          // Handle simple CSV splitting (does not handle quoted commas properly, but sufficient for simple metric exports)
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          
          if (cols.length < 2) continue;

          let rawDate = usePositions ? cols[0] : cols[dateIdx];
          const validDate = parseDate(rawDate);

          if (!validDate) {
            skippedRows++;
            continue;
          }

          const parseNum = (val: string) => {
            if (!val) return 0;
            // Remove currency symbols, commas, percentages
            return parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;
          };

          const impressions = parseNum(usePositions ? cols[1] : (impIdx > -1 ? cols[impIdx] : '0'));
          const clicks = parseNum(usePositions ? cols[2] : (clicksIdx > -1 ? cols[clicksIdx] : '0'));
          const spend = parseNum(usePositions ? cols[3] : (spendIdx > -1 ? cols[spendIdx] : '0'));
          const conversions = parseNum(usePositions ? cols[4] : (convIdx > -1 ? cols[convIdx] : '0'));

          newMetrics.push({
            date: validDate,
            platform,
            impressions,
            clicks,
            spend,
            conversions
          });
        }

        if (newMetrics.length === 0) {
            throw new Error("No valid data rows found. Please check date format.");
        }

        // Simulate processing delay for UX
        setTimeout(() => {
          onImport(newMetrics, file.name);
          setStatus('success');
          setMessage(`Successfully imported ${newMetrics.length} rows.${skippedRows > 0 ? ` (${skippedRows} skipped)` : ''}`);
          
          // Reset after 3 seconds
          setTimeout(() => {
            setStatus('idle');
            setMessage('');
            if(fileInputRef.current) fileInputRef.current.value = '';
          }, 3000);
        }, 1000);

      } catch (err) {
        setStatus('error');
        setMessage('Failed to parse CSV. Check columns: Date, Impressions, Clicks, Spend.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-center transition-colors">
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
          <p className="text-xs text-slate-500 mb-3">Supports DD/MM/YYYY or YYYY-MM-DD</p>
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