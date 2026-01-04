import React, { useState, useMemo } from 'react';
import { 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
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

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ metrics, changeLogs, isLoading }) => {
  const { theme } = useApp();
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('clicks');

  // Pre-process data: Compute CTR/CPC if needed and merge
  const chartData = useMemo(() => {
    return metrics.map(m => {
      const ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
      const cpc = m.clicks > 0 ? m.spend / m.clicks : 0;
      const conversionRate = m.clicks > 0 ? (m.conversions / m.clicks) * 100 : 0;

      // Find if there is a change log on this day
      const change = changeLogs.find(log => log.date === m.date);

      const dateObj = new Date(m.date);

      return {
        ...m,
        ctr: parseFloat(ctr.toFixed(2)),
        cpc: parseFloat(cpc.toFixed(2)),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        changeLog: change, // Attach change log to data point
        // Format: 24 Oct 23
        displayDate: dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }),
        // Full format for tooltip: 24 Oct 2023
        fullDate: dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      };
    });
  }, [metrics, changeLogs]);

  const activeMetricConfig = METRIC_OPTIONS.find(o => o.key === selectedMetric) || METRIC_OPTIONS[0];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const hasChange = !!data.changeLog;

      return (
        <div className="bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg max-w-xs z-50">
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">{data.fullDate}</p>
          <p className="font-bold text-slate-800 dark:text-white text-lg">
            {activeMetricConfig.format === 'currency' ? '$' : ''}
            {payload[0].value.toLocaleString()}
            {activeMetricConfig.format === 'percent' ? '%' : ''}
            <span className="text-xs font-normal text-slate-500 ml-1">{activeMetricConfig.label}</span>
          </p>

          {hasChange && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-brand-500"></div>
                <span className="text-xs font-bold text-brand-500 uppercase">{data.changeLog.changeType}</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                {data.changeLog.campaignName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {data.changeLog.description}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Dot to render when there is a change log
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.changeLog) {
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
      <div className="flex justify-end mb-4">
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
          className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-lg focus:ring-brand-500 focus:border-brand-500 block p-2"
        >
          {METRIC_OPTIONS.map(opt => (
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