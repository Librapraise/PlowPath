import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { useTranslation } from '../services/i18n';
import {
  Coins, FileText, MapPin, Map as MapIcon, RefreshCw, CheckCircle,
  AlertTriangle, Navigation, ArrowRight, Printer, Mail, Download, User
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Leaflet map panning component
function FitSignBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [bounds, map]);
  return null;
}

const signIcon = L.divIcon({
  className: 'plowpath-sign-marker',
  html: `<div style="width: 24px; height: 24px; border-radius: 50%; background: #6366f1; border: 3.5px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.55);"><span style="color: white; font-size: 10px; font-weight: 900;">📍</span></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function FinancePage() {
  const { t } = useTranslation();
  const [activeCustomers, setActiveCustomers] = useState<any[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [installedCount, setInstalledCount] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Sign routing state
  const [signAction, setSignAction] = useState<'install' | 'remove'>('install');
  const [signRouteData, setSignRouteData] = useState<any>(null);
  const [isLoadingSignRoute, setIsLoadingSignRoute] = useState(false);

  // Mail reminder state
  const [reminderCustomer, setReminderCustomer] = useState<any | null>(null);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch Page Data & Financial stats
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const [custRes, settingsRes] = await Promise.all([
        api.get('/customers', { params: { per_page: 200 } }),
        api.get('/settings').catch(() => null),
      ]);

      const roster = custRes.data.data || [];
      setActiveCustomers(roster);

      // Compute operational & financial metrics dynamically from roster
      const total = roster.length;
      const outstanding = roster.reduce((sum: number, c: any) => sum + Number(c.outstanding_balance || 0), 0);
      const overdue = roster.filter((c: any) => c.payment_status === 'overdue').length;
      const installed = roster.filter((c: any) => c.sign_status === 'installed').length;

      setTotalCustomers(total);
      setTotalOutstanding(outstanding);
      setOverdueCount(overdue);
      setInstalledCount(installed);

      if (settingsRes?.data) {
        setOrgSettings(settingsRes.data);
      }
    } catch {
      useToastStore.getState().addToast(t('Failed to retrieve financial parameters'), 'error');
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch Sign Crew TSP route
  const generateSignRoute = async () => {
    setIsLoadingSignRoute(true);
    try {
      const { data } = await api.get('/signs/route', { params: { action: signAction } });
      setSignRouteData(data);
      useToastStore.getState().addToast(t(signAction === 'install' ? 'Optimized install route generated successfully!' : 'Optimized remove route generated successfully!'), 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? t('Failed to optimize sign crew route');
      useToastStore.getState().addToast(msg, 'error');
    } finally {
      setIsLoadingSignRoute(false);
    }
  };

  // Trigger Sign route generation when action changes or roster changes
  useEffect(() => {
    generateSignRoute();
  }, [signAction]);

  // Export Outstanding accounts report
  const handleExportReminderReport = () => {
    const overdueList = activeCustomers.filter(c => c.payment_status === 'overdue' || Number(c.outstanding_balance || 0) > 0);
    if (overdueList.length === 0) {
      useToastStore.getState().addToast(t('No accounts currently require balances reminder'), 'info');
      return;
    }

    const headers = ['Customer Name', 'Address', 'Phone', 'Email', 'Payment Status', 'Outstanding Balance'];
    const lines = [headers.join(',')];
    overdueList.forEach(c => {
      lines.push([
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.address.replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        c.payment_status,
        Number(c.outstanding_balance || 0).toFixed(2)
      ].join(','));
    });

    const url = window.URL.createObjectURL(new Blob([lines.join('\n')]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plowpath_accounts_receivable_reminder.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Printable layout window trigger
  const handlePrintReminder = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow?.focus();
      iframeRef.current.contentWindow?.print();
    } else {
      window.print();
    }
  };

  // Direct email reminder trigger
  const handleSendEmailReminder = async () => {
    if (!reminderCustomer) return;
    setSendingReminder(true);
    try {
      await api.post(`/customers/${reminderCustomer.customer_id}/reminder`);
      useToastStore.getState().addToast(t('Payment reminder successfully emailed to') + ' ' + reminderCustomer.email + '!', 'success');
      setReminderModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? t('Failed to send payment reminder email');
      useToastStore.getState().addToast(msg, 'error');
    } finally {
      setSendingReminder(false);
    }
  };

  const signProgressPercent = totalCustomers > 0 ? Math.round((installedCount / totalCustomers) * 100) : 0;
  const overdueCustomers = activeCustomers.filter(c => Number(c.outstanding_balance || 0) > 0);

  const getInterpolatedTemplate = () => {
    if (!reminderCustomer) return '';
    const dateStr = new Date().toLocaleDateString();
    const refCode = `AR-${reminderCustomer.customer_id.substring(0, 8).toUpperCase()}`;
    const balance = Number(reminderCustomer.outstanding_balance || 0);

    const template = orgSettings?.settings?.message_templates?.email_overdue || `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OVERDUE ACCOUNT BALANCE INVOICE WARNING</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      margin: 0;
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }
    .header {
      background-color: #0f172a;
      padding: 24px;
      text-align: center;
    }
    .header-logo {
      color: #6366f1;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.025em;
    }
    .header-logo span {
      color: #ffffff;
    }
    .content {
      padding: 32px;
    }
    .doc-meta {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 16px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #64748b;
      overflow: hidden;
    }
    .doc-meta-left {
      float: left;
    }
    .doc-meta-right {
      float: right;
    }
    .address-grid {
      width: 100%;
      margin-bottom: 24px;
      font-size: 13px;
      color: #475569;
      overflow: hidden;
    }
    .address-col-left {
      width: 48%;
      float: left;
    }
    .address-col-right {
      width: 48%;
      float: right;
      text-align: right;
    }
    .address-title {
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .subject-line {
      font-weight: 700;
      border-left: 4px solid #ef4444;
      padding: 8px 12px;
      background-color: #fef2f2;
      color: #991b1b;
      font-size: 14px;
      margin-bottom: 20px;
      clear: both;
    }
    .body-text {
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    .summary-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .summary-card-left {
      width: 60%;
      float: left;
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    .summary-card-right {
      width: 38%;
      float: right;
      text-align: right;
    }
    .balance-amount {
      font-size: 24px;
      font-weight: 900;
      color: #e11d48;
    }
    .status-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 8px;
      background-color: #fecdd3;
      color: #e11d48;
      border-radius: 4px;
      margin-top: 4px;
    }
    .sign-off {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      font-size: 13px;
      color: #475569;
      clear: both;
    }
    .footer {
      background-color: #f8fafc;
      padding: 16px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">Plow<span>Path</span></div>
    </div>
    <div class="content">
      <div class="doc-meta">
        <div class="doc-meta-left">Date: {{date}}</div>
        <div class="doc-meta-right">Ref: {{ref_code}}</div>
      </div>

      <div class="address-grid">
        <div class="address-col-left">
          <div class="address-title">To:</div>
          <div>{{customer_name}}</div>
          <div>{{customer_address}}</div>
        </div>
        <div class="address-col-right">
          <div class="address-title">From Operations Office:</div>
          <div>PlowPath Corporate HQ</div>
          <div>1200 Buffalo Blvd, Suite 400</div>
          <div>Buffalo, NY 14202</div>
        </div>
      </div>

      <div class="subject-line">
        Subject: OVERDUE ACCOUNT BALANCE INVOICE WARNING
      </div>

      <div class="body-text" style="clear: both; padding-top: 10px;">
        Dear {{customer_name}},
      </div>

      <div class="body-text">
        We are contacting you today regarding an outstanding overdue balance on your snow removal operations profile. Our records indicate that you have serviced plowing tasks with outstanding invoice allocations.
      </div>

      <div class="summary-card">
        <div class="summary-card-left">
          <div>Servicing Property: <strong>{{customer_address}}</strong></div>
          <div>Account Status: <span class="status-badge">{{payment_status}}</span></div>
        </div>
        <div class="summary-card-right">
          <div class="balance-amount">{{outstanding_balance}}</div>
          <div style="font-size: 10px; color: #64748b;">Gross outstanding amount</div>
        </div>
      </div>

      <div class="body-text">
        Please submit payment allocations immediately utilizing card, check, or online bank transfer methods to avoid further late penalties or temporary operational deactivation of service priorities ahead of the next snow storm.
      </div>

      <div class="body-text">
        Thank you for your prompt attention to this matter. If you have already processed this payment, please contact our dispatch operations team at (555) 000-0000.
      </div>

      <div class="sign-off">
        <p style="margin: 0 0 16px 0; font-weight: 600;">Sincerely,</p>
        <p style="margin: 0; font-weight: 700; color: #0f172a;">PlowPath Dispatch Operations Office</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Billing &amp; Customer Support Accounts Team</p>
      </div>
    </div>
    <div class="footer">
      This is an automated billing notification from PlowPath. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>`;

    return template
      .replace(/{{customer_name}}/g, reminderCustomer.name)
      .replace(/{{customer_address}}/g, reminderCustomer.address)
      .replace(/{{date}}/g, dateStr)
      .replace(/{{ref_code}}/g, refCode)
      .replace(/{{payment_status}}/g, reminderCustomer.payment_status)
      .replace(/{{outstanding_balance}}/g, `$${balance.toFixed(2)}`);
  };

  // OSRM coordinates format
  const getPolylineCoordinates = () => {
    if (!signRouteData?.route_geometry?.coordinates) return [];
    return signRouteData.route_geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
  };

  const getMarkerBounds = (): [number, number][] => {
    if (!signRouteData?.stops || signRouteData.stops.length === 0) return [];
    return signRouteData.stops.map((s: any) => [s.lat, s.lon]);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">{t('Finance & Signs Console')}</h2>
          <p className="text-sm text-slate-400 mt-1 font-medium">{t('Monitor outstanding balances, invoice tracking, and winter placements')}</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={isLoadingStats}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/40 font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
          {t('Sync Roster')}
        </button>
      </div>

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: '50ms' }}>
        {/* Card 1: Gross A/R */}
        <div className="p-5 h-28 bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/40 hover:border-emerald-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(16,185,129,0.08)] transition-all duration-350 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between cursor-default">
          {/* Accent vertical pill */}
          <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-md bg-emerald-400 group-hover:top-3 group-hover:bottom-3 shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-all duration-300"></div>
          {/* Dynamic hover backdrop glow */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 group-hover:scale-125 transition-all duration-500"></div>
          {/* Parallax Watermark Background Icon */}
          <Coins className="absolute -right-2 -bottom-3 w-20 h-20 text-emerald-500/[0.06] group-hover:text-emerald-500/[0.13] group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 pointer-events-none z-0" />

          {/* Top Line: Label */}
          <div className="relative z-10 w-full">
            <p className="text-[10px] xl:text-[11px] text-slate-450 font-extrabold uppercase tracking-wider pl-1">
              {t('Gross Outstanding A/R')}
            </p>
          </div>
          
          {/* Bottom Line: Value */}
          <div className="relative z-10 pl-1">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none whitespace-nowrap transition-transform duration-300 group-hover:scale-[1.01]">
              ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
        </div>

        {/* Card 2: Overdue Accounts */}
        <div className="p-5 h-28 bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/40 hover:border-rose-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(244,63,94,0.08)] transition-all duration-350 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between cursor-default">
          {/* Accent vertical pill */}
          <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-md bg-rose-450 group-hover:top-3 group-hover:bottom-3 shadow-[0_0_12px_rgba(244,63,94,0.5)] transition-all duration-300"></div>
          {/* Dynamic hover backdrop glow */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/10 group-hover:scale-125 transition-all duration-500"></div>
          {/* Parallax Watermark Background Icon */}
          <AlertTriangle className="absolute -right-2 -bottom-3 w-20 h-20 text-rose-500/[0.06] group-hover:text-rose-500/[0.13] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 pointer-events-none z-0" />

          {/* Top Line: Label */}
          <div className="relative z-10 w-full">
            <p className="text-[10px] xl:text-[11px] text-slate-450 font-extrabold uppercase tracking-wider pl-1">
              {t('Overdue Accounts')}
            </p>
          </div>
          
          {/* Bottom Line: Value */}
          <div className="relative z-10 pl-1">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none whitespace-nowrap transition-transform duration-300 group-hover:scale-[1.01] flex items-baseline">
              <span>{overdueCount}</span>
              <span className="text-[10px] xl:text-xs text-slate-450 font-extrabold uppercase tracking-wider ml-1.5">
                {overdueCount === 1 ? t('property') : t('properties')}
              </span>
            </h3>
          </div>
        </div>

        {/* Card 3: Signs Installed */}
        <div className="p-5 h-28 bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/40 hover:border-sky-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(14,165,233,0.08)] transition-all duration-350 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between cursor-default">
          {/* Accent vertical pill */}
          <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-md bg-sky-400 group-hover:top-3 group-hover:bottom-3 shadow-[0_0_12px_rgba(14,165,233,0.5)] transition-all duration-300"></div>
          {/* Dynamic hover backdrop glow */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-500/10 group-hover:scale-125 transition-all duration-500"></div>
          {/* Parallax Watermark Background Icon */}
          <MapPin className="absolute -right-2 -bottom-3 w-20 h-20 text-sky-500/[0.06] group-hover:text-sky-500/[0.13] group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500 pointer-events-none z-0" />

          {/* Top Line: Label */}
          <div className="relative z-10 w-full">
            <p className="text-[10px] xl:text-[11px] text-slate-450 font-extrabold uppercase tracking-wider pl-1">
              {t('Signs Installed')}
            </p>
          </div>
          
          {/* Bottom Line: Value */}
          <div className="relative z-10 pl-1">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none whitespace-nowrap transition-transform duration-300 group-hover:scale-[1.01] flex items-baseline">
              <span>{installedCount}</span>
              <span className="text-sm xl:text-base text-slate-450 font-bold ml-1">
                / {totalCustomers}
              </span>
              <span className="text-[9px] xl:text-[10px] text-slate-500 font-extrabold uppercase tracking-wider ml-1.5">
                {t('installed')}
              </span>
            </h3>
          </div>
        </div>

        {/* Card 4: Installation Progress */}
        <div className="p-5 h-28 bg-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-800/40 hover:border-indigo-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.35),0_0_30px_rgba(99,102,241,0.08)] transition-all duration-350 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between cursor-default">
          {/* Accent vertical pill */}
          <div className="absolute left-0 top-1/4 bottom-1/4 w-[3px] rounded-r-md bg-indigo-400 group-hover:top-3 group-hover:bottom-3 shadow-[0_0_12px_rgba(99,102,241,0.5)] transition-all duration-300"></div>
          {/* Dynamic hover backdrop glow */}
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 group-hover:scale-125 transition-all duration-500"></div>
          {/* Parallax Watermark Background Icon */}
          <Navigation className="absolute -right-2 -bottom-3 w-20 h-20 text-indigo-500/[0.06] group-hover:text-indigo-500/[0.13] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 pointer-events-none z-0" />

          {/* Top Line: Label */}
          <div className="relative z-10 w-full">
            <p className="text-[10px] xl:text-[11px] text-slate-450 font-extrabold uppercase tracking-wider pl-1">
              {t('Installation Progress')}
            </p>
          </div>
          
          {/* Bottom Line: Value */}
          <div className="relative z-10 pl-1">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none whitespace-nowrap transition-transform duration-300 group-hover:scale-[1.01] flex items-baseline">
              <span>{signProgressPercent}%</span>
              <span className="text-[10px] xl:text-xs text-slate-450 font-extrabold uppercase tracking-wider ml-1.5">
                {t('Completed')}
              </span>
            </h3>
          </div>
        </div>
      </div>

      {/* Main Console Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Accounts Receivable Summary Console */}
        <div className="lg:col-span-5 space-y-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="p-5 glass-card rounded-2xl shadow-xl flex flex-col h-[650px]">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/40 pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Coins className="w-5 h-5 text-brand-400" />
                  {t('Accounts Receivable Console')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('Collect balances & export billing alert summaries')}</p>
              </div>
              <button
                onClick={handleExportReminderReport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/40 font-bold text-[10px] rounded-lg cursor-pointer"
                title={t('Download balance reminder spreadsheet')}
              >
                <Download className="w-3.5 h-3.5" />
                {t('Export A/R')}
              </button>
            </div>

            {/* A/R Overdue List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isLoadingStats ? (
                <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></span>
                  {t('Processing financial roster...')}
                </div>
              ) : overdueCustomers.length === 0 ? (
                <div className="py-20 text-center text-slate-500 text-xs font-semibold">
                  🎉 {t('Good job! Zero accounts are currently overdue.')}
                </div>
              ) : (
                overdueCustomers.map((c, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-950/40 border border-slate-800/40 hover:border-slate-700/40 rounded-xl flex items-center justify-between gap-4 transition-all">
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs text-slate-100 truncate">{c.name}</h4>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{c.address}</p>
                      <span className={`inline-block text-[9px] font-black uppercase tracking-wide mt-1.5 px-2 py-0.5 rounded ${c.payment_status === 'overdue' ? 'bg-red-500/10 text-red-400 border border-red-500/15' : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'}`}>
                        {t(c.payment_status)}
                      </span>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-200">${Number(c.outstanding_balance).toFixed(2)}</div>
                        <div className="text-[9px] font-medium text-slate-500 mt-0.5">{t('Balance due')}</div>
                      </div>
                      <button
                        onClick={() => {
                          setReminderCustomer(c);
                          setReminderModalOpen(true);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-brand-400 border border-slate-700/50 hover:border-brand-500/30 rounded-lg cursor-pointer transition-all"
                        title={t('Generate balance reminder warning letter')}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Sign Route Generator Map & TSP List */}
        <div className="lg:col-span-7 space-y-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <div className="p-5 glass-card rounded-2xl shadow-xl flex flex-col h-[650px]">
            {/* Header controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-slate-800/40 pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-indigo-400" />
                  {t('Sign Crew Route Planner')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('Generate optimized sign placement and transition paths')}</p>
              </div>

              {/* Mode Selectors */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSignAction('install')}
                  className={`px-3 py-1.5 font-bold text-[10px] rounded-lg border transition-all cursor-pointer ${signAction === 'install' ? 'bg-indigo-500/10 border-indigo-500/35 text-indigo-400' : 'bg-slate-855 border-slate-750 text-slate-450 hover:text-slate-200'}`}
                >
                  {t('Install Signs')}
                </button>
                <button
                  onClick={() => setSignAction('remove')}
                  className={`px-3 py-1.5 font-bold text-[10px] rounded-lg border transition-all cursor-pointer ${signAction === 'remove' ? 'bg-indigo-500/10 border-indigo-500/35 text-indigo-400' : 'bg-slate-855 border-slate-750 text-slate-450 hover:text-slate-200'}`}
                >
                  {t('Remove Signs')}
                </button>
              </div>
            </div>

            {/* Split layout inside planner */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-6 min-h-0">
              {/* Routing map display */}
              <div className="md:col-span-3 border border-slate-800/50 rounded-2xl overflow-hidden bg-slate-950/40 relative min-h-[220px] md:min-h-0">
                {isLoadingSignRoute ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-10 text-xs text-slate-455 gap-2">
                    <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                    {t('Running TSP optimization algorithms...')}
                  </div>
                ) : null}

                {signRouteData?.stops && signRouteData.stops.length > 0 ? (
                  <MapContainer
                    center={[signRouteData.stops[0].lat, signRouteData.stops[0].lon]}
                    zoom={12}
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                  >
                    <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {signRouteData.stops.map((stop: any) => (
                      <Marker key={stop.customer_id} position={[stop.lat, stop.lon]} icon={signIcon}>
                        <Popup>
                          <div className="p-1 space-y-1 text-slate-800 font-sans">
                            <div className="font-bold text-xs">#{stop.sequence_number} {stop.name}</div>
                            <div className="text-[10px] text-slate-500">{stop.address}</div>
                            <div className="text-[9px] bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded inline-block uppercase font-bold mt-1">
                              Status: {stop.sign_status}
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                    {getPolylineCoordinates().length > 0 && (
                      <Polyline
                        positions={getPolylineCoordinates()}
                        pathOptions={{ color: '#6366f1', weight: 4.5, opacity: 0.8, dashArray: '8, 8' }}
                      />
                    )}
                    <FitSignBounds bounds={getMarkerBounds()} />
                  </MapContainer>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                    <MapIcon className="w-8 h-8 text-slate-650 animate-pulse" />
                    <p className="text-xs font-semibold">{t('Zero sign tasks currently required.')}</p>
                    <p className="text-[10px] text-slate-600 max-w-[200px]">
                      {t('All active customers have already completed their seasonal placements!')}
                    </p>
                  </div>
                )}
              </div>

              {/* TSP Sequence List */}
              <div className="md:col-span-2 flex flex-col min-h-0">
                <div className="p-3.5 bg-slate-950/40 border border-slate-800/40 rounded-xl mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] text-slate-450 uppercase font-black tracking-wider">{t('Route Metrics')}</h4>
                    {signRouteData?.stops ? (
                      <div className="text-sm font-black text-slate-200 mt-1">
                        {signRouteData.stops.length} {t('Stops')} · {signRouteData.total_miles} mi
                      </div>
                    ) : (
                      <div className="text-xs text-slate-550 mt-1">0 {t('Stops')}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-450 uppercase font-black tracking-wider">{t('Progress')}</div>
                    <div className="text-sm font-black text-indigo-400 mt-1">
                      {signRouteData?.progress ?? 0}%
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {signRouteData?.stops && signRouteData.stops.length > 0 ? (
                    signRouteData.stops.map((stop: any, index: number) => (
                      <div key={index} className="p-2.5 bg-slate-900/40 border border-slate-850 hover:border-slate-800 rounded-lg flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-[10px] font-black text-indigo-400">
                          {stop.sequence_number}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-[11px] text-slate-100 truncate">{stop.name}</h5>
                          <p className="text-[9px] text-slate-500 truncate">{stop.address}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20 text-[11px] text-slate-650 font-medium">
                      {t('No stops in this optimized path.')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Reminder Warning Letter Modal */}
      {reminderCustomer && reminderModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReminderModalOpen(false)}></div>
          
          <div className="relative glass-card rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl flex flex-col animate-scale-up gradient-border max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-800/40 pb-3 mb-4 select-none">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-400" />
                {t('Mailing Balance Due Reminder Template')}
              </h3>
              <button
                onClick={() => setReminderModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 border border-slate-800 bg-slate-900/30 px-2.5 py-1.5 rounded-lg cursor-pointer"
              >
                {t('Close View')}
              </button>
            </div>

            {/* Letter Preview Screen (Dynamic Iframe Sandbox) */}
            <div className="flex-1 flex flex-col border border-slate-800 bg-white rounded-xl overflow-hidden shadow-inner mb-6 min-h-[450px]">
              <iframe
                ref={iframeRef}
                srcDoc={getInterpolatedTemplate()}
                title="Mailing Balance Due Reminder Template Preview"
                className="w-full flex-1 border-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 select-none">
              <button
                onClick={() => setReminderModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-330 font-semibold text-xs rounded-xl cursor-pointer border border-slate-700/40"
              >
                {t('Close Preview')}
              </button>
              <button
                onClick={handlePrintReminder}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/40 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {t('Print Letter')}
              </button>
              <button
                onClick={handleSendEmailReminder}
                disabled={sendingReminder || !reminderCustomer?.email}
                className={`flex items-center gap-1.5 px-5 py-2.5 text-white font-semibold text-xs rounded-xl shadow-lg transition-all cursor-pointer ring-1 ring-white/10 ${
                  sendingReminder || !reminderCustomer?.email
                    ? 'bg-slate-750 text-slate-500 opacity-50 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
                title={!reminderCustomer?.email ? t('This customer has no registered email address') : t('Send overdue notice directly via email')}
              >
                {sendingReminder ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {sendingReminder ? t('Sending...') : t('Send Email Reminder')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
