import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DailyMetric, ChangeLog, MetricKey } from '../../types';
import { CHART_COLORS, BRAND_COLOR } from '../../constants';
import { useApp } from '../../context/AppContext';
import { ChevronDown, Check } from 'lucide-react';

interface AnalyticsChartProps {
  metrics: DailyMetric[];
  changeLogs: ChangeLog[];
  isLoading: boolean;
}

type Granularity = 'daily' | 'weekly' | 'monthly';

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ metrics, changeLogs, isLoading }) => {
  const { theme, metricsConfig, selectedPlatform } = useApp();
  
  // State
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([]);
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get active metrics for this platform
  const platformMetrics = useMemo(() => {
    return metricsConfig.filter(m => m.platform === selectedPlatform);
  }, [metricsConfig, selectedPlatform]);

  const isSingleMetric = selectedMetrics.length === 1;

  // Initialize selected metrics if empty or invalid
  useEffect(() => {
    // If we have no selection or invalid selection, pick top 2 available
    const availableKeys = platformMetrics.map(m => m.key);
    const validSelected = selectedMetrics.filter(k => availableKeys.includes(k));
    
    if (validSelected.length === 0 && platformMetrics.length > 0) {
      // Default preference: Spend and Conversions if available, else just first two
      const preferred = ['spend', 'conversions'];
      const defaults = preferred.filter(k => availableKeys.includes(k));
      if (defaults.length > 0) {
        setSelectedMetrics(defaults);
      } else {
        setSelectedMetrics(availableKeys.slice(0, 2));
      }
    } else if (validSelected.length !== selectedMetrics.length) {
      setSelectedMetrics(validSelected);
    }
  }, [platformMetrics, selectedPlatform]); // removed selectedMetrics dependency to avoid loops, logic handled inside

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Selection Limit (Max 4)
  const toggleMetric = (key: string) => {
    if (selectedMetrics.includes(key)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(prev => prev.filter(k => k !== key));
      }
    } else {
      if (selectedMetrics.length < 4) {
        setSelectedMetrics(prev => [...prev, key]);
      }
    }
  };

  // Helper to get start of week (Monday)
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getStartOfMonth = (d: Date) => {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };

  const chartData = useMemo(() => {
    if (metrics.length === 0) return [];

    // 1. Group metrics based on granularity
    const groupedData = new Map<string, {
      dateObj: Date;
      rawAgg: Record<string, number>; // Stores sum of raw values
      countAgg: Record<string, number>; // Stores count of records (for averages)
      changeLogs: ChangeLog[];
    }>();

    metrics.forEach(m => {
      const dateObj = new Date(m.date);
      let key = m.date; 
      let groupDate = dateObj;

      if (granularity === 'weekly') {
        const startOfWeek = getStartOfWeek(dateObj);
        key = startOfWeek.toISOString().split('T')[0];
        groupDate = startOfWeek;
      } else if (granularity === 'monthly') {
        const startOfMonth = getStartOfMonth(dateObj);
        key = startOfMonth.toISOString().split('T')[0];
        groupDate = startOfMonth;
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          dateObj: groupDate,
          rawAgg: {},
          countAgg: {},
          changeLogs: []
        });
      }

      const entry = groupedData.get(key)!;
      
      // Aggregate all active metrics
      platformMetrics.forEach(def => {
        if (def.isDerived) return; // Skip derived metrics like CTR for raw aggregation

        // Determine value: try root property first, then customMetrics
        let val = 0;
        if (def.key in m) {
           val = (m as any)[def.key] || 0;
        } else if (m.customMetrics && def.key in m.customMetrics) {
           val = m.customMetrics[def.key] || 0;
        }

        entry.rawAgg[def.key] = (entry.rawAgg[def.key] || 0) + val;
        entry.countAgg[def.key] = (entry.countAgg[def.key] || 0) + 1;
      });

      const daysLogs = changeLogs.filter(l => l.date === m.date);
      entry.changeLogs.push(...daysLogs);
    });

    // 2. Aggregate and Calculate Derived Metrics
    let result = Array.from(groupedData.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(entry => {
        const processedRow: any = {
          changeLogs: entry.changeLogs,
          hasChange: entry.changeLogs.length > 0
        };

        // Date formatting
        if (granularity === 'monthly') {
           processedRow.displayDate = entry.dateObj.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
           processedRow.fullDate = entry.dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        } else if (granularity === 'weekly') {
           processedRow.displayDate = entry.dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
           processedRow.fullDate = `Week of ${entry.dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
        } else {
           processedRow.displayDate = entry.dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
           processedRow.fullDate = entry.dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        // Process non-derived metrics
        platformMetrics.forEach(def => {
           if (!def.isDerived) {
             const total = entry.rawAgg[def.key] || 0;
             const count = entry.countAgg[def.key] || 1;
             
             if (def.aggregation === 'average' && count > 0) {
               processedRow[def.key] = parseFloat((total / count).toFixed(2));
             } else {
               processedRow[def.key] = parseFloat(total.toFixed(2));
             }
           }
        });

        // Calculate Derived Metrics (CTR, CPC, ConversionRate) ONLY if they are active
        // Logic assumes 'impressions', 'clicks', 'spend', 'conversions' keys exist if needed
        const imps = entry.rawAgg['impressions'] || 0;
        const clicks = entry.rawAgg['clicks'] || 0;
        const spend = entry.rawAgg['spend'] || 0;
        const conv = entry.rawAgg['conversions'] || 0;

        platformMetrics.forEach(def => {
          if (def.isDerived) {
             let val = 0;
             if (def.key === 'ctr') val = imps > 0 ? (clicks / imps) * 100 : 0;
             if (def.key === 'cpc') val = clicks > 0 ? spend / clicks : 0;
             if (def.key === 'conversionRate') val = clicks > 0 ? (conv / clicks) * 100 : 0;
             if (def.key === 'cpa') val = conv > 0 ? spend / conv : 0;
             
             processedRow[def.key] = parseFloat(val.toFixed(2));
          }
        });

        return processedRow;
      });

    // 3. Normalize Data (0-100 Scale)
    // We calculate this regardless so the data keys exist
    const maxValues: Record<string, number> = {};
    selectedMetrics.forEach(key => {
      const max = Math.max(...result.map(d => (d as any)[key] || 0));
      maxValues[key] = max === 0 ? 1 : max; // Prevent divide by zero
    });

    result = result.map(d => {
      const normalizedProps: Record<string, number> = {};
      selectedMetrics.forEach(key => {
        const val = (d as any)[key] || 0;
        normalizedProps[`${key}_norm`] = (val / maxValues[key]) * 100;
      });
      return { ...d, ...normalizedProps };
    });

    return result;
  }, [metrics, changeLogs, granularity, platformMetrics, selectedMetrics]);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg max-w-xs z-50">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-2 font-medium">{data.fullDate}</p>
          
          <div className="space-y-2 mb-3">
            {selectedMetrics.map((key, index) => {
              const config = platformMetrics.find(o => o.key === key);
              if(!config) return null;
              
              const val = data[key];
              let formattedVal = val?.toLocaleString() || '0';
              if (config.format === 'currency') formattedVal = `$${val?.toLocaleString()}`;
              if (config.format === 'percent') formattedVal = `${val}%`;

              return (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></div>
                    <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">{config.label}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{formattedVal}</span>
                </div>
              );
            })}
          </div>

          {data.hasChange && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                {data.changeLogs.length} Change{data.changeLogs.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.changeLogs.map((log: ChangeLog, idx: number) => (
                   <div key={idx} className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-brand-500">{log.changeType}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 ml-1">
                        {log.campaignName}
                      </p>
                   </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload, stroke } = props;
    if (payload.hasChange) {
      const primaryDataKey = isSingleMetric ? selectedMetrics[0] : `${selectedMetrics[0]}_norm`;
      
      if (props.dataKey === primaryDataKey) {
        return (
            <g>
              <line x1={cx} y1={cy} x2={cx} y2={300} stroke={BRAND_COLOR} strokeDasharray="3 3" opacity={0.4} />
              <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="white" strokeWidth={2} />
            </g>
        );
      }
    }
    return null; 
  };

  if (isLoading) {
    return <div className="h-80 w-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-pulse">Loading chart...</div>;
  }

  if (metrics.length === 0) {
    return <div className="h-80 w-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg">No data available for this range. Import CSV to see metrics.</div>;
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 z-20 relative">
        {/* Granularity Toggle */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center">
           {(['daily', 'weekly', 'monthly'] as Granularity[]).map((g) => (
             <button
               key={g}
               onClick={() => setGranularity(g)}
               className={`
                 px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all
                 ${granularity === g 
                   ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                   : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                 }
               `}
             >
               {g}
             </button>
           ))}
        </div>

        {/* Multi-Select Metrics Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center justify-between w-48 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:border-brand-500 focus:outline-none"
          >
            <span className="truncate">
              {selectedMetrics.length} Selected
            </span>
            <ChevronDown size={16} className="text-slate-400 ml-2" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl z-50 overflow-hidden">
               <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                 <p className="text-xs font-semibold text-slate-500 uppercase">Select Metrics (Max 4)</p>
               </div>
               <div className="max-h-60 overflow-y-auto p-1">
                 {platformMetrics.map((opt) => {
                   const isSelected = selectedMetrics.includes(opt.key);
                   const isDisabled = !isSelected && selectedMetrics.length >= 4;
                   
                   return (
                     <button
                       key={opt.key}
                       onClick={() => toggleMetric(opt.key)}
                       disabled={isDisabled}
                       className={`
                         w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors
                         ${isSelected 
                           ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300' 
                           : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                         }
                         ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                       `}
                     >
                       <span>{opt.label}</span>
                       {isSelected && <Check size={14} className="text-brand-500" />}
                     </button>
                   );
                 })}
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="h-80 w-full relative">
         {/* Y-Axis Label for Normalized Data - Only show if normalized */}
        {!isSingleMetric && (
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-slate-400 uppercase tracking-widest pointer-events-none">
            Relative Scale (0-100%)
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#27272a' : '#e2e8f0'} vertical={false} />
            <XAxis 
              dataKey="displayDate" 
              stroke={theme === 'dark' ? '#71717a' : '#64748b'} 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            
            {/* Y-Axis: Switch between normalized 0-100 and absolute values */}
            <YAxis 
              stroke={theme === 'dark' ? '#71717a' : '#64748b'} 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              domain={isSingleMetric ? ['auto', 'auto'] : [0, 100]}
              tickFormatter={(val) => {
                if (!isSingleMetric) return `${val}%`;
                
                // Format specific single metric
                const config = platformMetrics.find(o => o.key === selectedMetrics[0]);
                if (config?.format === 'currency') return `$${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`;
                if (config?.format === 'percent') return `${val}%`;
                if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
                return val;
              }}
              width={isSingleMetric ? 45 : 30}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => <span style={{ color: theme === 'dark' ? '#e2e8f0' : '#334155', fontSize: '12px', fontWeight: 500 }}>{value}</span>}
            />

            {/* Render a Line for each selected metric */}
            {selectedMetrics.map((metricKey, index) => {
              const metricConfig = platformMetrics.find(m => m.key === metricKey);
              return (
                <Line 
                  key={metricKey}
                  type="monotone" 
                  // If single metric, use raw value, else use normalized value
                  dataKey={isSingleMetric ? metricKey : `${metricKey}_norm`}
                  name={metricConfig?.label || metricKey}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]} 
                  strokeWidth={2}
                  dot={<CustomDot />}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  isAnimationActive={false} // Smoother toggling
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};