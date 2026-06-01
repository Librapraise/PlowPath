import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { 
  BarChart3, Coins, Users, Clock, Fuel, Download, TrendingUp, AlertTriangle, HelpCircle, 
  ChevronRight, Calendar, ArrowUpRight, ShieldAlert, Cpu
} from 'lucide-react';

interface StormAnalytics {
  storm_id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  forecasted_accumulation: number;
  actual_accumulation: number;
  status: string;
  completed_stops: number;
  total_distance_mi: number;
  total_labor_hours: number;
  revenue: number;
  labor_cost: number;
  fuel_cost: number;
  direct_costs: number;
  gross_margin: number;
  overhead_allocation: number;
  net_margin: number;
  fleet_utilization_percent: number;
}

interface DriverRank {
  driver_id: string;
  name: string;
  completed_stops: number;
  labor_hours: number;
  properties_per_hour: number;
  hourly_rate: number;
  total_payout: number;
  vehicle_type: string;
}

interface SeasonalForecast {
  historical_baseline_storms: number;
  average_revenue_per_storm: number;
  projections: {
    mild_winter: { estimated_storms: number; projected_revenue: number };
    average_winter: { estimated_storms: number; projected_revenue: number };
    severe_winter: { estimated_storms: number; projected_revenue: number };
  };
}

interface CrewRecommendation {
  total_active_properties: number;
  average_driver_clearing_speed_mph: number;
  target_completion_window_hours: number;
  recommended_crew_size: number;
  scenarios: Array<{
    storm_size_inches: number;
    multiplier: number;
    recommended_crew: number;
  }>;
}

interface PricingAlert {
  customer_id: string;
  customer_name: string;
  property_type: string;
  address: string;
  revenue_per_stop: number;
  allocated_cost_per_stop: number;
  profit_margin_percent: number;
  recommendation: string;
}

export default function AnalyticsPage() {
  const addToast = useToastStore((s) => s.addToast);
  
  // Dashboard states
  const [loading, setLoading] = useState(true);
  const [seasonalData, setSeasonalData] = useState<StormAnalytics[]>([]);
  const [driverRankings, setDriverRankings] = useState<DriverRank[]>([]);
  const [forecast, setForecast] = useState<SeasonalForecast | null>(null);
  const [crewRec, setCrewRec] = useState<CrewRecommendation | null>(null);
  const [pricingAlerts, setPricingAlerts] = useState<PricingAlert[]>([]);
  
  // Dynamic Crew Sim State
  const [simProperties, setSimProperties] = useState(120);
  const [simTargetHours, setSimTargetHours] = useState(8);
  const [selectedStormId, setSelectedStormId] = useState<string>('all');
  
  // Date filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Load Data
  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const [
          seasonalRes,
          driversRes,
          forecastRes,
          crewRes,
          pricingRes
        ] = await Promise.all([
          api.get<StormAnalytics[]>('/analytics/seasonal'),
          api.get<DriverRank[]>('/analytics/driver/rankings'),
          api.get<SeasonalForecast>('/analytics/forecast/seasonal'),
          api.get<CrewRecommendation>('/analytics/forecast/crew-size'),
          api.get<PricingAlert[]>('/analytics/forecast/pricing')
        ]);

        setSeasonalData(seasonalRes.data);
        setDriverRankings(driversRes.data);
        setForecast(forecastRes.data);
        setCrewRec(crewRes.data);
        setPricingAlerts(pricingRes.data);

        if (crewRes.data) {
          setSimProperties(crewRes.data.total_active_properties);
        }
      } catch {
        addToast('Failed to load seasonal analytics payloads', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  // Filter storms by date range and selection
  const filteredStorms = seasonalData.filter((s) => {
    if (startDate && new Date(s.start_time || '') < new Date(startDate)) return false;
    if (endDate && new Date(s.start_time || '') > new Date(endDate)) return false;
    return true;
  });

  const activeStormData = selectedStormId === 'all' 
    ? filteredStorms 
    : filteredStorms.filter((s) => s.storm_id === selectedStormId);

  // Financial aggregates
  const totalRevenue = activeStormData.reduce((sum, s) => sum + s.revenue, 0);
  const totalLaborCost = activeStormData.reduce((sum, s) => sum + s.labor_cost, 0);
  const totalFuelCost = activeStormData.reduce((sum, s) => sum + s.fuel_cost, 0);
  const totalDirectCosts = activeStormData.reduce((sum, s) => sum + s.direct_costs, 0);
  const totalNetMargin = activeStormData.reduce((sum, s) => sum + s.net_margin, 0);
  const totalStopsCleared = activeStormData.reduce((sum, s) => sum + s.completed_stops, 0);
  
  const averageNetMarginPercent = totalRevenue > 0 ? (totalNetMargin / totalRevenue) * 100 : 0;

  // Simulator crew recommendation:
  // Crew Size = Properties / (Clearing Speed * Target Window)
  const averageHourlySpeed = crewRec?.average_driver_clearing_speed_mph ?? 1.5;
  const calculatedCrewRec = Math.max(1, Math.ceil(simProperties / (averageHourlySpeed * simTargetHours)));

  // Trigger global spreadsheet CSV download
  const handleCsvExport = () => {
    const wsUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
    window.open(`${wsUrl}/analytics/export`, '_blank');
    addToast('Initiating financial ledger CSV download', 'success');
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-slate-800/40 rounded-xl shimmer-bg"></div>
          <div className="h-10 w-32 bg-slate-800/40 rounded-xl shimmer-bg"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl glass-card shimmer-bg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 lg:col-span-2 rounded-2xl glass-card shimmer-bg"></div>
          <div className="h-96 rounded-2xl glass-card shimmer-bg"></div>
        </div>
      </div>
    );
  }

  // Draw responsive Line Chart paths for SVG
  const lineChartWidth = 500;
  const lineChartHeight = 150;
  const padding = 20;

  const points = filteredStorms.map((s, index) => {
    const x = padding + (index * (lineChartWidth - 2 * padding)) / Math.max(1, filteredStorms.length - 1);
    const maxRev = Math.max(...filteredStorms.map((st) => st.revenue), 100);
    const y = lineChartHeight - padding - (s.revenue * (lineChartHeight - 2 * padding)) / maxRev;
    return { x, y, name: s.name, val: s.revenue };
  });

  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${lineChartHeight - padding} L ${points[0].x} ${lineChartHeight - padding} Z`
    : '';

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 ring-1 ring-white/10">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Business Intelligence</h2>
            <p className="text-sm text-slate-400 mt-1 font-medium">Real-time snow operations financial analysis, margins, and capacity planners</p>
          </div>
        </div>

        <div className="flex items-center gap-3 no-print">
          {/* CSV Export */}
          <button
            onClick={handleCsvExport}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export Ledger CSV
          </button>

          {/* PDF Export */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-brand-500 to-indigo-500 hover:from-brand-600 hover:to-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Date & Selector Filter Dashboard */}
      <div className="glass-card p-4 rounded-xl border border-slate-850 flex flex-wrap items-center justify-between gap-4 animate-slide-up">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Date From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Filter Storm:</span>
          <select
            value={selectedStormId}
            onChange={(e) => setSelectedStormId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs font-bold text-brand-400 focus:outline-none cursor-pointer"
          >
            <option value="all">All Storm Events (Timeline)</option>
            {filteredStorms.map((s) => (
              <option key={s.storm_id} value={s.storm_id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Cards Roster Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
        {/* Gross Revenue */}
        <div className="glass-card p-6 rounded-2xl border border-slate-850 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Coins className="w-16 h-16 text-emerald-400" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gross Revenue</span>
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center gap-0.5 text-[9px] font-extrabold">
              <TrendingUp className="w-2.5 h-2.5" /> Allocated
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-black text-white font-mono mt-1">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Allocated from completed stops</p>
          </div>
        </div>

        {/* Direct Costs */}
        <div className="glass-card p-6 rounded-2xl border border-slate-850 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Fuel className="w-16 h-16 text-indigo-400" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Operating Costs</span>
            <span className="text-[9px] font-bold text-slate-500">Labor & Fuel</span>
          </div>
          <div>
            <h3 className="text-3xl font-black text-white font-mono mt-1">${totalDirectCosts.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <div className="flex items-center gap-3 mt-1 text-[10px] font-semibold text-slate-400">
              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3 text-brand-400" /> Labor: ${totalLaborCost.toFixed(0)}</span>
              <span className="flex items-center gap-0.5"><Fuel className="w-3 h-3 text-indigo-400" /> Fuel: ${totalFuelCost.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Net Profit Margin */}
        <div className="glass-card p-6 rounded-2xl border border-slate-850 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Coins className="w-16 h-16 text-brand-400" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Margin (15% Overhead)</span>
            <span className="px-1.5 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/15 rounded-md text-[9px] font-black font-mono">
              {averageNetMarginPercent.toFixed(1)}%
            </span>
          </div>
          <div>
            <h3 className="text-3xl font-black text-white font-mono mt-1">${totalNetMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Post operational overhead deduction</p>
          </div>
        </div>

        {/* stops cleared */}
        <div className="glass-card p-6 rounded-2xl border border-slate-850 relative overflow-hidden flex flex-col justify-between h-36">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Users className="w-16 h-16 text-indigo-400" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Properties Serviced</span>
            <span className="text-[9px] font-bold text-slate-500">Stop SLA</span>
          </div>
          <div>
            <h3 className="text-3xl font-black text-white font-mono mt-1">{totalStopsCleared}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Completed customer route sequences</p>
          </div>
        </div>
      </div>

      {/* Main Charts & Forecasting Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
        {/* Playback Line Charts */}
        <div className="glass-card p-6 rounded-2xl border border-slate-850 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/40 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">Chronological Gross Revenue Trend</h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Historical storm-by-storm financial earnings and growth curve</p>
            </div>
            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Total Storms: {filteredStorms.length}
            </span>
          </div>

          <div className="relative pt-4 flex justify-center">
            {points.length > 0 ? (
              <svg viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`} className="w-full max-h-56 overflow-visible">
                <defs>
                  <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38b0f8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#38b0f8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Grid Lines */}
                <line x1={padding} y1={lineChartHeight - padding} x2={lineChartWidth - padding} y2={lineChartHeight - padding} stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
                <line x1={padding} y1={padding} x2={lineChartWidth - padding} y2={padding} stroke="#334155" strokeWidth="0.5" strokeDasharray="3,3" />

                {/* Area under curve */}
                <path d={areaPath} fill="url(#glowGrad)" />

                {/* Main Line path */}
                <path d={linePath} fill="none" stroke="#38b0f8" strokeWidth="2.5" className="drop-shadow-[0_2px_8px_rgba(56,176,248,0.4)]" />

                {/* Nodes */}
                {points.map((p, idx) => (
                  <g key={idx} className="group cursor-pointer">
                    <circle cx={p.x} cy={p.y} r="4" fill="#0a0f1a" stroke="#38b0f8" strokeWidth="2" className="transition-all hover:r-6" />
                    <text x={p.x} y={p.y - 8} fontSize="7" fill="#f8fafc" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-mono">
                      ${p.val.toFixed(0)}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs font-semibold text-slate-500">No storm financial data recorded for selected date filters.</div>
            )}
          </div>
        </div>

        {/* Seasonal Projections Extrapolations */}
        <div className="glass-card p-6 rounded-2xl border border-slate-850 flex flex-col justify-between">
          <div className="border-b border-slate-800/40 pb-4">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-brand-400" /> Seasonal Revenue Projections
            </h3>
            <p className="text-[10px] text-slate-450 mt-0.5">Extrapolated revenue models derived from storm frequency</p>
          </div>

          <div className="space-y-4 py-4 flex-1 flex flex-col justify-center">
            {forecast ? (
              <div className="space-y-3">
                {/* Mild */}
                <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-350 uppercase">Mild Winter (12 Storms)</h4>
                    <p className="text-[9px] text-slate-500 mt-0.5">Extrapolated baseline average</p>
                  </div>
                  <span className="text-sm font-black text-slate-300 font-mono">${forecast.projections.mild_winter.projected_revenue.toLocaleString()}</span>
                </div>

                {/* Average */}
                <div className="flex items-center justify-between p-3 bg-brand-500/[0.03] border border-brand-500/15 rounded-xl">
                  <div>
                    <h4 className="text-[11px] font-black text-brand-400 uppercase">Average Winter (18 Storms)</h4>
                    <p className="text-[9px] text-slate-500 mt-0.5">Standard regional winter forecast</p>
                  </div>
                  <span className="text-sm font-black text-brand-400 font-mono">${forecast.projections.average_winter.projected_revenue.toLocaleString()}</span>
                </div>

                {/* Severe */}
                <div className="flex items-center justify-between p-3 bg-indigo-500/[0.03] border border-indigo-500/15 rounded-xl">
                  <div>
                    <h4 className="text-[11px] font-black text-indigo-400 uppercase">Severe Winter (24 Storms)</h4>
                    <p className="text-[9px] text-slate-500 mt-0.5">Lake-effect heavy winter projection</p>
                  </div>
                  <span className="text-sm font-black text-indigo-300 font-mono">${forecast.projections.severe_winter.projected_revenue.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-550 text-center font-medium">Calculating projections...</p>
            )}
          </div>

          <div className="text-[10px] text-slate-500 font-semibold text-center border-t border-slate-850 pt-3">
            *Based on storm average: <span className="font-mono text-slate-400">${forecast?.average_revenue_per_storm.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      </div>

      {/* Simulator and Pricing Alerts Split Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
        {/* Capacity Planner / Crew Simulator */}
        <div className="glass-card p-6 rounded-2xl border border-slate-850 space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <Users className="w-4.5 h-4.5 text-brand-400" /> Operational Crew-Size Simulator
            </h3>
            <p className="text-[10px] text-slate-450 mt-0.5">Estimate minimum active plow trucks needed to clear customer properties within target SLA times</p>
          </div>

          <div className="space-y-4">
            {/* Slider 1: Active Properties */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>Active Customer Properties:</span>
                <span className="font-mono text-brand-400">{simProperties} stops</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                value={simProperties}
                onChange={(e) => setSimProperties(parseInt(e.target.value))}
                className="w-full accent-brand-500 bg-slate-850 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Slider 2: SLA Time */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>Target SLA Clearing Window:</span>
                <span className="font-mono text-indigo-400">{simTargetHours} hours</span>
              </div>
              <input
                type="range"
                min="4"
                max="24"
                value={simTargetHours}
                onChange={(e) => setSimTargetHours(parseInt(e.target.value))}
                className="w-full accent-indigo-500 bg-slate-850 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center font-black text-xl font-mono text-brand-400 shadow-inner">
              {calculatedCrewRec}
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-200">Recommended Active Crew Sizing</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-semibold">Minimum active trucks to complete clearing at average speed (<span className="text-slate-400 font-mono">{averageHourlySpeed.toFixed(1)} props/hour</span>)</p>
            </div>
          </div>
        </div>

        {/* Bottom Decile Pricing Optimization Alerts */}
        <div className="glass-card p-6 rounded-2xl border border-slate-850 space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4.5 h-4.5 text-amber-500" /> Pricing Optimization Signals
            </h3>
            <p className="text-[10px] text-slate-450 mt-0.5">Geographic cohorts or customer accounts with bottom-decile clearing margins</p>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-thin">
            {pricingAlerts.length > 0 ? (
              pricingAlerts.map((alert, idx) => (
                <div key={idx} className="p-3 bg-amber-500/[0.02] border border-amber-500/15 rounded-xl space-y-2 animate-fade-in">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{alert.customer_name}</h4>
                      <p className="text-[9px] text-slate-500 font-medium truncate max-w-[200px] mt-0.5">{alert.address}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/15 text-[9px] font-black font-mono text-red-400">
                      Margin: {alert.profit_margin_percent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                    <span className="flex items-center gap-0.5"><Coins className="w-3.5 h-3.5 text-slate-500" /> Stop Rev: ${alert.revenue_per_stop}</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-3.5 h-3.5 text-slate-500" /> Allocated Cost: ${alert.allocated_cost_per_stop}</span>
                  </div>
                  <p className="text-[10px] text-amber-500/90 font-medium bg-amber-500/[0.04] p-1.5 border border-amber-500/10 rounded-lg leading-relaxed">{alert.recommendation}</p>
                </div>
              ))
            ) : (
              <div className="p-8 border border-slate-850 border-dashed rounded-xl flex flex-col items-center justify-center text-center">
                <AlertTriangle className="w-8 h-8 text-slate-655 opacity-40 mb-2" />
                <h4 className="text-xs font-bold text-slate-400">No Bottom-Decile Alerts Found</h4>
                <p className="text-[10px] text-slate-500 max-w-[250px] mt-1 font-semibold leading-relaxed">Completed stop margins are currently above operational cost baselines.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ranks & Storm Ledgers Split Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
        {/* Storm Ledgers Table */}
        <div className="glass-card p-6 rounded-2xl border border-slate-850 lg:col-span-2 space-y-4">
          <div className="border-b border-slate-800/40 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-white">Storm Ingestion & Financial Ledger</h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Storm-by-storm operational hours, distances, and net margins</p>
            </div>
            <span className="text-[10px] font-black text-indigo-400 border border-indigo-500/15 bg-indigo-500/5 px-2.5 py-1 rounded-full font-mono">
              Timeline List
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-450 font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-2.5">Storm Name</th>
                  <th className="py-2.5">Stops</th>
                  <th className="py-2.5">Dist. (mi)</th>
                  <th className="py-2.5 font-mono">Labor Hours</th>
                  <th className="py-2.5">Revenue</th>
                  <th className="py-2.5">Operating Cost</th>
                  <th className="py-2.5">Net Margin</th>
                  <th className="py-2.5">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30 text-slate-300 font-semibold font-mono">
                {filteredStorms.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/[0.08] transition-colors">
                    <td className="py-3 font-sans text-slate-200 font-extrabold max-w-[120px] truncate">{s.name}</td>
                    <td className="py-3 text-slate-400">{s.completed_stops} stops</td>
                    <td className="py-3 text-slate-450">{s.total_distance_mi} mi</td>
                    <td className="py-3 text-slate-400">{s.total_labor_hours}h</td>
                    <td className="py-3 text-emerald-400 font-extrabold">${s.revenue.toFixed(0)}</td>
                    <td className="py-3 text-slate-400">${s.direct_costs.toFixed(0)}</td>
                    <td className={`py-3 font-extrabold ${s.net_margin >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
                      ${s.net_margin.toFixed(0)}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[10px] font-black ${s.fleet_utilization_percent > 120 ? 'text-amber-400' : s.fleet_utilization_percent < 50 ? 'text-slate-450' : 'text-indigo-400'}`}>
                          {(s.fleet_utilization_percent || 0).toFixed(0)}%
                        </span>
                        <div className="w-10 bg-slate-950/60 border border-slate-850 rounded-full h-1 overflow-hidden hidden xl:block">
                          <div 
                            className={`h-full rounded-full ${s.fleet_utilization_percent > 120 ? 'bg-amber-500 shadow-[0_0_4px_#f59e0b]' : s.fleet_utilization_percent < 50 ? 'bg-slate-600' : 'bg-indigo-500 shadow-[0_0_4px_#6366f1]'}`}
                            style={{ width: `${Math.min(100, s.fleet_utilization_percent || 0)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crew SLA Efficiency Rankings with Visual horizontal SVG Bar Chart */}
        <div className="glass-card p-6 rounded-2xl border border-slate-850 space-y-4">
          <div className="border-b border-slate-800/40 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-white">Driver Efficiency SLA Ranks</h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Roster speed indexes displaying completed stops per hour</p>
            </div>
          </div>

          <div className="space-y-3">
            {driverRankings.length > 0 ? (
              (() => {
                const maxSpeed = Math.max(...driverRankings.map(d => d.properties_per_hour), 1.0);
                return driverRankings.map((rank, index) => (
                  <div key={rank.driver_id} className="flex flex-col p-3 bg-slate-950/40 border border-slate-900 rounded-xl relative group hover:bg-slate-900/[0.12] transition-colors gap-2 font-sans">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center font-bold text-xs text-indigo-400">
                          #{index + 1}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-200">{rank.name}</h4>
                          <p className="text-[9px] text-slate-500 font-semibold mt-0.5">{rank.vehicle_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-brand-400 font-mono">{rank.properties_per_hour.toFixed(1)} stops/h</span>
                        <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Cleared: {rank.completed_stops} stops ({rank.labor_hours.toFixed(0)}h)</p>
                      </div>
                    </div>

                    {/* SVG Driver Efficiency SLA horizontal bar chart */}
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-850 relative">
                      <div 
                        className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.45)] transition-all duration-500"
                        style={{ width: `${(rank.properties_per_hour / maxSpeed) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ));
              })()
            ) : (
              <p className="text-xs text-slate-550 text-center font-medium py-8">No driver performance records available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Global CSS Stylesheet inject for High-Fidelity Print-to-PDF reports */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Hide sidebar, navigation header, control selectors, date-selectors and header buttons */
          aside, nav, header, button, .no-print, select, input {
            display: none !important;
          }
          body, #root {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Full width print optimization */
          main, .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 10px !important;
            margin: 0 !important;
          }
          /* High contrast dark/light printable borders for cards */
          .glass-card {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            color: #0f172a !important;
            break-inside: avoid;
          }
          h2, h3, h4, p, span, td, th, div {
            color: #0f172a !important;
          }
          /* SVG Grayscale rendering for laser printers */
          svg {
            filter: contrast(150%) grayscale(100%) !important;
          }
          line {
            stroke: #94a3b8 !important;
          }
          path {
            stroke: #0f172a !important;
          }
          circle {
            stroke: #0f172a !important;
            fill: #ffffff !important;
          }
          /* Grid print adjustments */
          .grid {
            display: grid !important;
            grid-template-cols: 1fr !important;
            gap: 20px !important;
          }
          @page {
            size: letter portrait;
            margin: 0.5in;
          }
        }
      `}} />
    </div>
  );
}
