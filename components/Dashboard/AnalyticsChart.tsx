import React, { useState, useMemo } from 'react';
import { 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area
} from 'recharts';
import { DailyMetric, ChangeLog, MetricKey } from '../../types';
import { METRIC_OPTIONS, BRAND_COLOR } from '../../constants';
import { useApp } from '../../context/AppContext';

interface AnalyticsChartProps {
  metrics: DailyMetric[];
  changeLogs: ChangeLog[];
  isLoading: boolean;
}

type Granularity = 'daily' | 'weekly' | 'monthly';

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ metrics, changeLogs, isLoading }) => {
  const { theme, customMetrics } = useApp();
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('clicks');
  const [granularity, setGranularity] = useState<Granularity>('daily');

  // Combine standard and custom metrics options
  const allMetricOptions = useMemo(() => {
    const customOptions = customMetrics.map(m => ({
      key: m.key,
      label: m.label,
      format: m.format
    }));
    return [...METRIC_OPTIONS, ...customOptions];
  }, [customMetrics]);

  // Helper to get start of week (Monday)
  const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
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
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
      customAgg: Record<string, number>;
      customCounts: Record<string, number>; // Used for averaging
      changeLogs: ChangeLog[];
    }>();

    metrics.forEach(m => {
      const dateObj = new Date(m.date);
      let key = m.date; // Default daily key (YYYY-MM-DD)
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
          impressions: 0,
          clicks: 0,
          spend: 0,
          conversions: 0,
          customAgg: {},
          customCounts: {},
          changeLogs: []
        });
      }

      const entry = groupedData.get(key)!;
      entry.impressions += m.impressions;
      entry.clicks += m.clicks;
      entry.spend += m.spend;
      entry.conversions += m.conversions;

      // Handle Custom Metrics Aggregation
      if (m.customMetrics) {
        Object.keys(m.customMetrics).forEach(cKey => {
          const val = m.customMetrics![cKey] || 0;
          entry.customAgg[cKey] = (entry.customAgg[cKey] || 0) + val;
          entry.customCounts[cKey] = (entry.customCounts[cKey] || 0) + 1;
        });
      }

      const daysLogs = changeLogs.filter(l => l.date === m.date);
      entry.changeLogs.push(...daysLogs);
    });

    // 2. Convert to array and calculate rates
    const result = Array.from(groupedData.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(entry => {
        const ctr = entry.impressions > 0 ? (entry.clicks / entry.impressions) * 100 : 0;
        const cpc = entry.clicks > 0 ? entry.spend / entry.clicks : 0;
        const conversionRate = entry.clicks > 0 ? (entry.conversions / entry.clicks) * 100 : 0;

        // Flatten custom metrics based on aggregation type
        const flattenedCustom: Record<string, number> = {};
        customMetrics.forEach(def => {
          const total = entry.customAgg[def.key] || 0;
          const count = entry.customCounts[def.key] || 1;
          
          if (def.aggregation === 'average' && count > 0) {
            flattenedCustom[def.key] = parseFloat((total / count).toFixed(2));
          } else {
            flattenedCustom[def.key] = parseFloat(total.toFixed(2));
          }
        });

        // Date formatting based on granularity
        let displayDate = '';
        let fullDate = '';

        if (granularity === 'monthly') {
           displayDate = entry.dateObj.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }); // Oct 23
           fullDate = entry.dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        } else if (granularity === 'weekly') {
           displayDate = entry.dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); // 24 Oct
           fullDate = `Week of ${entry.dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`;
        } else {
           displayDate = entry.dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
           fullDate = entry.dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        return {
          ...entry,
          ctr: parseFloat(ctr.toFixed(2)),
          cpc: parseFloat(cpc.toFixed(2)),
          conversionRate: parseFloat(conversionRate.toFixed(2)),
          ...flattenedCustom, // Spread custom metrics to top level
          displayDate,
          fullDate,
          hasChange: entry.changeLogs.length > 0
        };
      });

    return result;
  }, [metrics, changeLogs, granularity, customMetrics]);

  const activeMetricConfig = allMetricOptions.find(o => o.key === selectedMetric) || allMetricOptions[0];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg max-w-xs z-50">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{data.fullDate}</p>
          <p className="font-bold text-slate-800 dark:text-white text-lg">
            {activeMetricConfig.format === 'currency' ? '$' : ''}
            {payload[0].value.toLocaleString()}
            {activeMetricConfig.format === 'percent' ? '%' : ''}
            <span className="text-xs font-normal text-slate-500 ml-1">{activeMetricConfig.label}</span>
          </p>

          {data.hasChange && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                {data.changeLogs.length} Change{data.changeLogs.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {data.changeLogs.map((log: ChangeLog, idx: number) => (
                   <div key={idx} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                        <span className="text-xs font-semibold text-brand-500">{log.changeType}</span>
                        {granularity !== 'daily' && <span className="text-[10px] text-slate-400">{new Date(log.date).getDate()}th</span>}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 ml-3.5 line-clamp-1">
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
    const { cx, cy, payload } = props;
    if (payload.hasChange) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill={BRAND_COLOR} stroke="white" strokeWidth={2} />
          <line x1={cx} y1={cy} x2={cx} y2={300} stroke={BRAND_COLOR} strokeDasharray="3 3" opacity={0.5} />
        </g>
      );
    }
    return <circle cx={cx} cy={cy} r={0} />;
  };

  if (isLoading) {
    return <div className="h-80 w-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-pulse">Loading chart...</div>;
  }

  if (metrics.length === 0) {
    return <div className="h-80 w-full flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg">No data available for this range. Import CSV to see metrics.</div>;
  }

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
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

        {/* Metric Selector */}
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
          className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2 w-full sm:w-auto"
        >
          {allMetricOptions.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BRAND_COLOR} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={BRAND_COLOR} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} vertical={false} />
            <XAxis 
              dataKey="displayDate" 
              stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis 
              stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (activeMetricConfig.format === 'currency') return `$${value}`;
                if (activeMetricConfig.format === 'percent') return `${value}%`;
                if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                return value;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            <Area 
              type="monotone" 
              dataKey={selectedMetric} 
              stroke="none" 
              fillOpacity={1} 
              fill="url(#colorMetric)" 
            />
            <Line 
              type="monotone" 
              dataKey={selectedMetric} 
              stroke={BRAND_COLOR} 
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 6, fill: BRAND_COLOR, stroke: 'white', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};