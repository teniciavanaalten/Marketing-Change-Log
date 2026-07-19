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
  ReferenceLine,
} from 'recharts';
import { DailyMetric, ChangeLog, MetricKey } from '../../types';
import { CHART_COLORS, BRAND_COLOR, MASTER_VIEW_ID, DEFAULT_METRICS_TEMPLATE } from '../../constants';
import { useApp } from '../../context/AppContext';
import { ChevronDown, Check } from 'lucide-react';

interface AnalyticsChartProps {
  metrics: DailyMetric[];
  changeLogs: ChangeLog[];
  isLoading: boolean;
}

type Granularity = 'daily' | 'weekly' | 'monthly';

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ metrics, changeLogs, isLoading }) => {
  const { theme, metricsConfig, selectedPlatform, platforms, dateRange } = useApp();

  // Master "Cockpit" view: all platforms on one timeline, one line per platform
  const isMaster = selectedPlatform === MASTER_VIEW_ID;

  const platformColor = (platformId: string) =>
    platforms.find(p => p.id === platformId)?.color || BRAND_COLOR;

  // Color used for change-event marker lines in per-platform view
  const eventColor = platformColor(selectedPlatform);

  // State
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([]);
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get active metrics for this platform.
  // In master view: the fixed core metric set shared by every DailyMetric.
  const platformMetrics = useMemo(() => {
    if (isMaster) {
      return DEFAULT_METRICS_TEMPLATE.map(m => ({ ...m, platform: MASTER_VIEW_ID }));
    }
    return metricsConfig.filter(m => m.platform === selectedPlatform);
  }, [metricsConfig, selectedPlatform, isMaster]);

  const isSingleMetric = selectedMetrics.length === 1;
  // Master view always plots ONE metric (per-platform lines) on an absolute scale
  const useAbsoluteScale = isMaster || isSingleMetric;

  // Initialize selected metrics if empty or invalid
  useEffect(() => {
    const availableKeys = platformMetrics.map(m => m.key);

    // Master view is single-metric only
    if (isMaster) {
      if (selectedMetrics.length !== 1 || !availableKeys.includes(selectedMetrics[0])) {
        setSelectedMetrics(['spend']);
      }
      return;
    }

    // If we have no selection or invalid selection, pick top 2 available
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

  // Handle Selection Limit (Max 4); master view is single-select
  const toggleMetric = (key: string) => {
    if (isMaster) {
      setSelectedMetrics([key]);
      setIsDropdownOpen(false);
      return;
    }
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

    // Resolve the bucket (key + representative date) for a YYYY-MM-DD string
    const getBucket = (dateStr: string): { key: string; dateObj: Date } => {
      const dateObj = new Date(dateStr);
      if (granularity === 'weekly') {
        const startOfWeek = getStartOfWeek(dateObj);
        return { key: startOfWeek.toISOString().split('T')[0], dateObj: startOfWeek };
      }
      if (granularity === 'monthly') {
        const startOfMonth = getStartOfMonth(dateObj);
        return { key: startOfMonth.toISOString().split('T')[0], dateObj: startOfMonth };
      }
      return { key: dateStr, dateObj };
    };

    const startTime = new Date(dateRange.start).getTime();
    const endTime = new Date(dateRange.end).getTime();
    if (isNaN(startTime) || isNaN(endTime) || startTime > endTime) return [];
    const DAY_MS = 24 * 60 * 60 * 1000;

    // Shared axis/tooltip labels per bucket
    const formatDates = (dateObj: Date): { displayDate: string; fullDate: string } => {
      if (granularity === 'monthly') {
        return {
          displayDate: dateObj.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
          fullDate: dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        };
      }
      if (granularity === 'weekly') {
        return {
          displayDate: dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
          fullDate: `Week of ${dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`
        };
      }
      return {
        displayDate: dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }),
        fullDate: dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      };
    };

    // MASTER VIEW: one line per platform for the single selected metric.
    // Derived metrics are computed per platform per bucket from summed
    // numerators/denominators — never by averaging ratios.
    if (isMaster) {
      const grouped = new Map<string, {
        dateObj: Date;
        perPlatform: Record<string, { impressions: number; clicks: number; spend: number; conversions: number }>;
        changeLogs: ChangeLog[];
      }>();

      for (let t = startTime; t <= endTime; t += DAY_MS) {
        const dayStr = new Date(t).toISOString().split('T')[0];
        const { key, dateObj } = getBucket(dayStr);
        if (!grouped.has(key)) {
          grouped.set(key, { dateObj, perPlatform: {}, changeLogs: [] });
        }
      }

      metrics.forEach(m => {
        const { key, dateObj } = getBucket(m.date);
        if (!grouped.has(key)) {
          grouped.set(key, { dateObj, perPlatform: {}, changeLogs: [] });
        }
        const entry = grouped.get(key)!;
        const agg = entry.perPlatform[m.platform] ||
          (entry.perPlatform[m.platform] = { impressions: 0, clicks: 0, spend: 0, conversions: 0 });
        agg.impressions += m.impressions || 0;
        agg.clicks += m.clicks || 0;
        agg.spend += m.spend || 0;
        agg.conversions += m.conversions || 0;
      });

      changeLogs.forEach(l => {
        const entry = grouped.get(getBucket(l.date).key);
        if (entry) entry.changeLogs.push(l);
      });

      const metricKey = selectedMetrics[0] || 'spend';

      return Array.from(grouped.values())
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
        .map(entry => {
          const row: any = {
            ...formatDates(entry.dateObj),
            changeLogs: entry.changeLogs,
            hasChange: entry.changeLogs.length > 0
          };

          platforms.forEach(p => {
            const agg = entry.perPlatform[p.id];
            if (!agg) {
              row[p.id] = null; // No data for this platform in this bucket
              return;
            }
            let val = 0;
            if (metricKey === 'ctr') val = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;
            else if (metricKey === 'cpc') val = agg.clicks > 0 ? agg.spend / agg.clicks : 0;
            else if (metricKey === 'cpa') val = agg.conversions > 0 ? agg.spend / agg.conversions : 0;
            else if (metricKey === 'conversionRate') val = agg.clicks > 0 ? (agg.conversions / agg.clicks) * 100 : 0;
            else val = (agg as any)[metricKey] || 0; // Base metrics: summed

            row[p.id] = parseFloat(val.toFixed(2));
          });

          return row;
        });
    }

    // 1. Build buckets for EVERY day in the selected date range,
    // so events on days without metric rows still get a slot on the axis.
    const groupedData = new Map<string, {
      dateObj: Date;
      rawAgg: Record<string, number>; // Stores sum of raw values
      countAgg: Record<string, number>; // Stores count of records (for averages)
      changeLogs: ChangeLog[];
      hasData: boolean; // Whether any metric row landed in this bucket
    }>();

    for (let t = startTime; t <= endTime; t += DAY_MS) {
      const dayStr = new Date(t).toISOString().split('T')[0];
      const { key, dateObj } = getBucket(dayStr);
      if (!groupedData.has(key)) {
        groupedData.set(key, {
          dateObj,
          rawAgg: {},
          countAgg: {},
          changeLogs: [],
          hasData: false
        });
      }
    }

    // 2. Aggregate metric rows into their buckets
    metrics.forEach(m => {
      const { key, dateObj } = getBucket(m.date);

      if (!groupedData.has(key)) {
        // Metric row outside the built range (defensive) — still show it
        groupedData.set(key, {
          dateObj,
          rawAgg: {},
          countAgg: {},
          changeLogs: [],
          hasData: false
        });
      }

      const entry = groupedData.get(key)!;
      entry.hasData = true;

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
    });

    // 3. Map every change-log event into its containing bucket,
    // independent of whether that bucket has metric data
    changeLogs.forEach(l => {
      const { key } = getBucket(l.date);
      const entry = groupedData.get(key);
      if (entry) entry.changeLogs.push(l);
    });

    // 4. Aggregate and Calculate Derived Metrics
    let result = Array.from(groupedData.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(entry => {
        const processedRow: any = {
          changeLogs: entry.changeLogs,
          hasChange: entry.changeLogs.length > 0
        };

        // Date formatting
        Object.assign(processedRow, formatDates(entry.dateObj));

        // Buckets without any metric rows get null values so lines can
        // skip over them (rendered with connectNulls)
        if (!entry.hasData) {
          platformMetrics.forEach(def => {
            processedRow[def.key] = null;
          });
          return processedRow;
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

    // 5. Normalize Data (0-100 Scale)
    // We calculate this regardless so the data keys exist
    const maxValues: Record<string, number> = {};
    selectedMetrics.forEach(key => {
      const max = Math.max(...result.map(d => (d as any)[key] || 0));
      maxValues[key] = max === 0 ? 1 : max; // Prevent divide by zero
    });

    result = result.map(d => {
      const normalizedProps: Record<string, number | null> = {};
      selectedMetrics.forEach(key => {
        const val = (d as any)[key];
        // Preserve nulls so connectNulls can bridge missing days
        normalizedProps[`${key}_norm`] = val == null ? null : (val / maxValues[key]) * 100;
      });
      return { ...d, ...normalizedProps };
    });

    return result;
  }, [metrics, changeLogs, granularity, platformMetrics, selectedMetrics, dateRange, isMaster, platforms]);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg max-w-xs z-50">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-2 font-medium">{data.fullDate}</p>
          
          <div className="space-y-2 mb-3">
            {isMaster ? (
              // Master view: one value per platform for the selected metric
              payload
                .filter((entry: any) => entry.value != null)
                .map((entry: any) => {
                  const config = platformMetrics.find(o => o.key === selectedMetrics[0]);
                  const val = entry.value;
                  let formattedVal = val?.toLocaleString() || '0';
                  if (config?.format === 'currency') formattedVal = `$${val?.toLocaleString()}`;
                  if (config?.format === 'percent') formattedVal = `${val}%`;

                  return (
                    <div key={entry.dataKey} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">{entry.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{formattedVal}</span>
                    </div>
                  );
                })
            ) : (
              selectedMetrics.map((key, index) => {
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
              })
            )}
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
                        {isMaster && (
                          <>
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: platformColor(log.platform) }}
                            ></span>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                              {platforms.find(p => p.id === log.platform)?.label || log.platform}
                            </span>
                          </>
                        )}
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
              {isMaster
                ? (platformMetrics.find(m => m.key === selectedMetrics[0])?.label || 'Select Metric')
                : `${selectedMetrics.length} Selected`}
            </span>
            <ChevronDown size={16} className="text-slate-400 ml-2" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl z-50 overflow-hidden">
               <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                 <p className="text-xs font-semibold text-slate-500 uppercase">{isMaster ? 'Select Metric' : 'Select Metrics (Max 4)'}</p>
               </div>
               <div className="max-h-60 overflow-y-auto p-1">
                 {platformMetrics.map((opt) => {
                   const isSelected = selectedMetrics.includes(opt.key);
                   const isDisabled = !isMaster && !isSelected && selectedMetrics.length >= 4;
                   
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
        {!useAbsoluteScale && (
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
              domain={useAbsoluteScale ? ['auto', 'auto'] : [0, 100]}
              tickFormatter={(val) => {
                if (!useAbsoluteScale) return `${val}%`;

                // Format specific single metric
                const config = platformMetrics.find(o => o.key === selectedMetrics[0]);
                if (config?.format === 'currency') return `$${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`;
                if (config?.format === 'percent') return `${val}%`;
                if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
                return val;
              }}
              width={useAbsoluteScale ? 45 : 30}
            />
            
            <Tooltip content={<CustomTooltip />} />

            {/* Change-log events as full-height dashed marker lines */}
            {chartData.filter((d: any) => d.hasChange).map((d: any) => {
              // Master view: color the marker by the event's platform
              // (first event wins when multiple platforms share a bucket)
              const markerColor = isMaster ? platformColor(d.changeLogs[0].platform) : eventColor;
              return (
                <ReferenceLine
                  key={`event-${d.displayDate}`}
                  x={d.displayDate}
                  stroke={markerColor}
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={d.changeLogs.length > 1 ? {
                    value: `${d.changeLogs.length}×`,
                    position: 'top',
                    fill: markerColor,
                    fontSize: 10,
                    fontWeight: 700
                  } : undefined}
                />
              );
            })}


            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => <span style={{ color: theme === 'dark' ? '#e2e8f0' : '#334155', fontSize: '12px', fontWeight: 500 }}>{value}</span>}
            />

            {/* Master view: one line per platform. Per-platform view: one line per selected metric. */}
            {isMaster
              ? platforms.map(p => (
                  <Line
                    key={p.id}
                    type="monotone"
                    dataKey={p.id}
                    name={p.label}
                    stroke={p.color}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                ))
              : selectedMetrics.map((metricKey, index) => {
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
                      dot={false}
                      connectNulls
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