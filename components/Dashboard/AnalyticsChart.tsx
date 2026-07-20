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
import { ChevronDown, Check, Plus, X } from 'lucide-react';

interface AnalyticsChartProps {
  metrics: DailyMetric[];
  changeLogs: ChangeLog[];
  isLoading: boolean;
}

type Granularity = 'daily' | 'weekly' | 'monthly';
type MasterMode = 'vergelijk' | 'correleer';

// A correlation series: one (platform, metric) pair
interface CorrSeries {
  platform: string;
  metric: string;
}

// Lighten a #rrggbb color toward white by pct (0-1), for series sharing a platform
const shadeColor = (hex: string, pct: number): string => {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const n = parseInt(match[1], 16);
  const ch = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.min(255, Math.round(c + (255 - c) * pct));
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
};

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

  // Correlation mode (master view only)
  const [mode, setMode] = useState<MasterMode>('vergelijk');
  const [corrSeries, setCorrSeries] = useState<CorrSeries[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addPlatformId, setAddPlatformId] = useState<string>('');
  const addRef = useRef<HTMLDivElement>(null);

  const isCorrelate = isMaster && mode === 'correleer';
  const pickerPlatform = addPlatformId || platforms[0]?.id || '';

  // Per-series colors: platform color, lightened when a platform repeats
  const seriesColors = useMemo(() => {
    const counts: Record<string, number> = {};
    return corrSeries.map(s => {
      const k = counts[s.platform] || 0;
      counts[s.platform] = k + 1;
      const base = platforms.find(p => p.id === s.platform)?.color || BRAND_COLOR;
      return k === 0 ? base : shadeColor(base, Math.min(0.7, k * 0.35));
    });
  }, [corrSeries, platforms]);

  const seriesLabels = corrSeries.map(s => {
    const pLabel = platforms.find(p => p.id === s.platform)?.label || s.platform;
    const mLabel = metricsConfig.find(m => m.platform === s.platform && m.key === s.metric)?.label || s.metric;
    return `${pLabel} · ${mLabel}`;
  });

  const addSeries = (platform: string, metric: string) => {
    setCorrSeries(prev =>
      prev.length >= 4 || prev.some(s => s.platform === platform && s.metric === metric)
        ? prev
        : [...prev, { platform, metric }]
    );
    setIsAddOpen(false);
  };

  const removeSeries = (index: number) => {
    setCorrSeries(prev => prev.filter((_, i) => i !== index));
  };

  // Get active metrics for this platform.
  // In master view: the fixed core metric set shared by every DailyMetric.
  const platformMetrics = useMemo(() => {
    if (isMaster) {
      return DEFAULT_METRICS_TEMPLATE.map(m => ({ ...m, platform: MASTER_VIEW_ID }));
    }
    return metricsConfig.filter(m => m.platform === selectedPlatform);
  }, [metricsConfig, selectedPlatform, isMaster]);

  const isSingleMetric = selectedMetrics.length === 1;
  // Vergelijk (master) plots ONE metric on an absolute scale; correlation mode
  // is always min-max normalized 0-100
  const useAbsoluteScale = isCorrelate ? false : (isMaster || isSingleMetric);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (addRef.current && !addRef.current.contains(event.target as Node)) {
        setIsAddOpen(false);
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

    // MASTER + CORRELEER: user-composed (platform, metric) series, each
    // min-max normalized 0-100 over the visible range. Derived metrics come
    // from that platform's summed numerators/denominators per bucket.
    if (isCorrelate) {
      const grouped = new Map<string, {
        dateObj: Date;
        perPlatformRows: Record<string, DailyMetric[]>;
        changeLogs: ChangeLog[];
      }>();

      for (let t = startTime; t <= endTime; t += DAY_MS) {
        const dayStr = new Date(t).toISOString().split('T')[0];
        const { key, dateObj } = getBucket(dayStr);
        if (!grouped.has(key)) grouped.set(key, { dateObj, perPlatformRows: {}, changeLogs: [] });
      }

      metrics.forEach(m => {
        const { key, dateObj } = getBucket(m.date);
        if (!grouped.has(key)) grouped.set(key, { dateObj, perPlatformRows: {}, changeLogs: [] });
        const entry = grouped.get(key)!;
        (entry.perPlatformRows[m.platform] = entry.perPlatformRows[m.platform] || []).push(m);
      });

      changeLogs.forEach(l => {
        const entry = grouped.get(getBucket(l.date).key);
        if (entry) entry.changeLogs.push(l);
      });

      const rows = Array.from(grouped.values())
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
        .map(entry => {
          const row: any = {
            ...formatDates(entry.dateObj),
            changeLogs: entry.changeLogs,
            hasChange: entry.changeLogs.length > 0
          };

          corrSeries.forEach((s, i) => {
            const platformRows = entry.perPlatformRows[s.platform];
            if (!platformRows || platformRows.length === 0) {
              row[`s${i}`] = null;
              return;
            }
            const def = metricsConfig.find(m => m.platform === s.platform && m.key === s.metric);
            let val = 0;
            if (def?.isDerived) {
              let imps = 0, clicks = 0, spend = 0, conv = 0;
              platformRows.forEach(m => {
                imps += m.impressions || 0;
                clicks += m.clicks || 0;
                spend += m.spend || 0;
                conv += m.conversions || 0;
              });
              if (s.metric === 'ctr') val = imps > 0 ? (clicks / imps) * 100 : 0;
              else if (s.metric === 'cpc') val = clicks > 0 ? spend / clicks : 0;
              else if (s.metric === 'cpa') val = conv > 0 ? spend / conv : 0;
              else if (s.metric === 'conversionRate') val = clicks > 0 ? (conv / clicks) * 100 : 0;
            } else {
              let total = 0;
              platformRows.forEach(m => {
                if (s.metric in m) total += (m as any)[s.metric] || 0;
                else if (m.customMetrics && s.metric in m.customMetrics) total += m.customMetrics[s.metric] || 0;
              });
              val = def?.aggregation === 'average' ? total / platformRows.length : total;
            }
            row[`s${i}`] = parseFloat(val.toFixed(2));
          });

          return row;
        });

      // Min-max normalize each series over the visible range (guard flat series)
      corrSeries.forEach((_s, i) => {
        const vals = rows.map(r => r[`s${i}`]).filter((v: any) => v != null) as number[];
        const min = vals.length ? Math.min(...vals) : 0;
        const max = vals.length ? Math.max(...vals) : 0;
        const range = max - min;
        rows.forEach(r => {
          const v = r[`s${i}`];
          r[`s${i}_norm`] = v == null ? null : range === 0 ? 50 : ((v - min) / range) * 100;
        });
      });

      return rows;
    }

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
  }, [metrics, changeLogs, granularity, platformMetrics, selectedMetrics, dateRange, isMaster, platforms, isCorrelate, corrSeries, metricsConfig]);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg max-w-xs z-50">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-2 font-medium">{data.fullDate}</p>
          
          <div className="space-y-2 mb-3">
            {isCorrelate ? (
              // Correlation mode: REAL (unnormalized) values per series
              corrSeries.map((s, i) => {
                const val = data[`s${i}`];
                if (val == null) return null;
                const def = metricsConfig.find(m => m.platform === s.platform && m.key === s.metric);
                let formattedVal = val.toLocaleString();
                if (def?.format === 'currency') formattedVal = `$${val.toLocaleString()}`;
                if (def?.format === 'percent') formattedVal = `${val}%`;

                return (
                  <div key={`${s.platform}-${s.metric}`} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: seriesColors[i] }}></div>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{seriesLabels[i]}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{formattedVal}</span>
                  </div>
                );
              })
            ) : isMaster ? (
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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Master view: Vergelijk / Correleer mode toggle */}
          {isMaster && (
            <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center">
              {(['vergelijk', 'correleer'] as MasterMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all
                    ${mode === m
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }
                  `}
                >
                  {m === 'vergelijk' ? 'Vergelijk' : 'Correleer'}
                </button>
              ))}
            </div>
          )}

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
        </div>

        {isCorrelate ? (
          /* Correlation mode: active series as chips + add-signal popover */
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {corrSeries.map((s, i) => (
              <span
                key={`${s.platform}-${s.metric}`}
                className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seriesColors[i] }}></span>
                {seriesLabels[i]}
                <button
                  onClick={() => removeSeries(i)}
                  className="p-0.5 text-slate-400 hover:text-red-500 transition-colors"
                  title="Verwijder signaal"
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            {corrSeries.length < 4 && (
              <div className="relative" ref={addRef}>
                <button
                  onClick={() => setIsAddOpen(!isAddOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-500 rounded-full text-xs font-medium text-slate-600 dark:text-slate-200 hover:border-brand-500 hover:text-brand-600 transition-colors"
                >
                  <Plus size={12} />
                  Voeg signaal toe
                </button>

                {isAddOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Platform</p>
                      <select
                        value={pickerPlatform}
                        onChange={e => setAddPlatformId(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                      >
                        {platforms.map(p => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {metricsConfig.filter(m => m.platform === pickerPlatform).map(m => {
                        const taken = corrSeries.some(s => s.platform === pickerPlatform && s.metric === m.key);
                        return (
                          <button
                            key={m.key}
                            onClick={() => addSeries(pickerPlatform, m.key)}
                            disabled={taken}
                            className={`
                              w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors text-left
                              ${taken
                                ? 'opacity-50 cursor-not-allowed text-slate-400'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }
                            `}
                          >
                            <span>{m.label}</span>
                            {taken && <Check size={14} className="text-slate-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
        /* Metrics Dropdown (multi-select; single-select in master Vergelijk) */
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
        )}
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

            {/* Correleer: one line per composed series. Master Vergelijk: one line
                per platform. Per-platform view: one line per selected metric. */}
            {isCorrelate
              ? corrSeries.map((s, i) => (
                  <Line
                    key={`${s.platform}-${s.metric}`}
                    type="monotone"
                    dataKey={`s${i}_norm`}
                    name={seriesLabels[i]}
                    stroke={seriesColors[i]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    activeDot={{ r: 5, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                ))
              : isMaster
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