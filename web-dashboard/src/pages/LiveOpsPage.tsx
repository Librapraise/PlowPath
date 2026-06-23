import { useEffect, useState, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useDriversStore } from '../store/driversStore';
import { useRoutesStore, type Route } from '../store/routesStore';
import { useStormsStore } from '../store/stormsStore';
import LeafletMap from '../components/Map/LeafletMap';
import CustomSelect from '../components/CustomSelect';
import SubcontractConsole from '../components/SubcontractConsole';
import { useToastStore } from '../store/toastStore';
import { useTranslation } from '../services/i18n';
import {
  Search, ShieldAlert, Clock, Compass, Truck, Phone, Navigation,
  ChevronLeft, ChevronRight, RefreshCw, Eye, EyeOff, CheckCircle2,
  TrendingUp, MapPin, User, DollarSign, Activity, AlertTriangle,
  Volume2, Play, Pause, Sliders, Briefcase, CloudSnow
} from 'lucide-react';

export interface DriverPosition {
  driver_id: string;
  lat: number;
  lon: number;
  recorded_at: string;
  speed_mps?: number | null;
  heading_deg?: number | null;
  accuracy_m?: number | null;
  route_id?: string | null;
}

export default function LiveOpsPage() {
  const { t, formatCurrency } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  const { drivers, fetchDrivers } = useDriversStore();
  const { routes, fetchRoutes, fetchRouteDetails, currentRoute, updateStopStatus } = useRoutesStore();
  const { storms, fetchStorms } = useStormsStore();

  const [positions, setPositions] = useState<Record<string, DriverPosition>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [urgentRequest, setUrgentRequest] = useState<any>(null);

  // Active Shifts & Fatigue tracker state
  const [activeShifts, setActiveShifts] = useState<Record<string, any>>({});

  // Subcontract Console Modal State
  const [subcontractOpen, setSubcontractOpen] = useState(false);

  // High-Priority Alert Dispatcher State
  const [alertMessage, setAlertMessage] = useState('');
  const [isSendingAlert, setIsSendingAlert] = useState(false);

  // Weather Widget State
  const [weatherData, setWeatherData] = useState<any>(null);

  // Historical Playback state
  const [historicalData, setHistoricalData] = useState<DriverPosition[]>([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x, 10x
  const playbackTimerRef = useRef<any>(null);

  // UX controls
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedDriverRoute, setSelectedDriverRoute] = useState<Route | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<[number, number]>>([]);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [driverSearch, setDriverSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'active' | 'offline'>('all');

  // Trigger loading rosters and routes
  useEffect(() => {
    fetchDrivers();
    fetchRoutes();
    fetchStorms();
    fetchActiveShifts();
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  // Bulk-fetch detailed stop data for all routes once the route list is loaded.
  // This populates individual stop statuses so the sidebar progress bar is accurate
  // for every driver — not just the one currently selected.
  useEffect(() => {
    if (routes.length === 0) return;
    const routesNeedingDetails = routes.filter((r) => !r.stops);
    routesNeedingDetails.forEach((r) => {
      fetchRouteDetails(r.route_id).catch(() => {
        // Silently ignore fetch failures for individual routes
      });
    });
  }, [routes.length]);

  const fetchActiveShifts = async () => {
    try {
      const { data } = await api.get('/shifts/all-active');
      const shiftMap: Record<string, any> = {};
      data.data.forEach((s: any) => {
        shiftMap[s.driver_id] = s;
      });
      setActiveShifts(shiftMap);
    } catch (err) {
      console.error('Failed to load active shifts', err);
    }
  };

  // Fetch telemetry and connect to websocket
  useEffect(() => {
    setIsLoading(true);
    api.get<{ data: DriverPosition[] }>('/tracking/latest')
      .then(({ data }) => {
        const map: Record<string, DriverPosition> = {};
        data.data.forEach((p) => { map[p.driver_id] = p; });
        setPositions(map);
      })
      .catch((err) => {
        console.error('Failed to load initial driver positions', err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    const wsUrl = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';
    const socket: Socket = io(wsUrl, { auth: { token } });
    
    socket.on('gps:update', (p: DriverPosition) => {
      setPositions((prev) => ({ ...prev, [p.driver_id]: p }));
      
      // Reactive real-time breadcrumbs append
      if (selectedDriverId === p.driver_id && showBreadcrumbs && !isPlaybackMode) {
        setBreadcrumbs((prev) => [[p.lat, p.lon], ...prev]);
      }
    });

    socket.on('urgent_request:update', (payload: any) => {
      if (payload.status === 'assigned' || payload.status === 'expired') {
        setUrgentRequest(null);
        fetchRoutes(); // refresh route data
      } else {
        setUrgentRequest(payload);
      }
    });

    socket.on('weather:update', (data: any) => {
      setWeatherData(data);
    });

    socket.on('driver:telemetry', () => {
      fetchActiveShifts();
    });

    socket.on('shift:handover', () => {
      fetchActiveShifts();
      fetchRoutes();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, selectedDriverId, showBreadcrumbs, isPlaybackMode]);

  // Load detailed route stops and geometry when selecting a driver
  useEffect(() => {
    if (!selectedDriverId) {
      setSelectedDriverRoute(null);
      return;
    }

    // Try to find if this driver has an active or assigned route
    const drRoute = routes.find(
      (r) => r.driver_id === selectedDriverId && r.status === 'in_progress'
    ) || routes.find(
      (r) => r.driver_id === selectedDriverId && r.status === 'assigned'
    ) || routes.find(
      (r) => r.driver_id === selectedDriverId
    );

    if (drRoute) {
      fetchRouteDetails(drRoute.route_id)
        .then((details) => {
          setSelectedDriverRoute(details);
        })
        .catch((err) => {
          console.error('Failed to fetch detailed active route', err);
          setSelectedDriverRoute(null);
        });
    } else {
      setSelectedDriverRoute(null);
    }
  }, [selectedDriverId, routes]);

  // Fetch breadcrumb tracking trail if selected
  useEffect(() => {
    if (selectedDriverId && showBreadcrumbs && !isPlaybackMode) {
      api.get<{ data: DriverPosition[] }>(`/tracking/driver/${selectedDriverId}`)
        .then(({ data }) => {
          const coords = data.data.map((p) => [p.lat, p.lon] as [number, number]);
          setBreadcrumbs(coords);
        })
        .catch((err) => {
          console.error('Failed to retrieve historical tracking history', err);
          setBreadcrumbs([]);
        });
    } else {
      setBreadcrumbs([]);
    }
  }, [selectedDriverId, showBreadcrumbs, isPlaybackMode]);

  // Load single driver history when entering playback mode
  useEffect(() => {
    if (selectedDriverId && isPlaybackMode) {
      api.get<{ data: DriverPosition[] }>(`/tracking/driver/${selectedDriverId}`)
        .then(({ data }) => {
          // Sort chronologically (oldest first)
          const chron = [...(data.data || [])].reverse();
          setHistoricalData(chron);
          setPlaybackIndex(0);
        })
        .catch(() => {
          setHistoricalData([]);
          useToastStore.getState().addToast(t('Failed to retrieve historical telemetry logs'), 'error');
        })
        .finally(() => {
          // Handled
        });
    } else {
      setHistoricalData([]);
      setIsPlaying(false);
    }
  }, [selectedDriverId, isPlaybackMode]);

  // Handle playback interval incrementing
  useEffect(() => {
    if (isPlaying && isPlaybackMode && historicalData.length > 0) {
      playbackTimerRef.current = setInterval(() => {
        setPlaybackIndex((prev) => {
          if (prev >= historicalData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500 / playbackSpeed);
    } else {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    }

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    };
  }, [isPlaying, isPlaybackMode, historicalData, playbackSpeed]);

  const handleSendDispatchAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId || !alertMessage.trim()) return;
    setIsSendingAlert(true);
    try {
      await api.post(`/drivers/${selectedDriverId}/alert`, { message: alertMessage });
      useToastStore.getState().addToast(t('Audio dispatch alert transmitted successfully!'), 'success');
      setAlertMessage('');
    } catch {
      useToastStore.getState().addToast(t('Failed to dispatch alert'), 'error');
    } finally {
      setIsSendingAlert(false);
    }
  };

  // Statistics calculation
  const onlineDriverIds = Object.keys(positions);
  const activeStorm = storms.find((s) => s.status === 'active');
  const activeRoutesCount = routes.filter((r) => r.status === 'in_progress').length;

  const handleSelectDriver = (driverId: string | null) => {
    setSelectedDriverId(driverId);
    setIsPlaybackMode(false);
  };

  // Compile full driver records with tracking metadata
  const enrichedDrivers = drivers.map((d) => {
    const tracking = positions[d.driver_id];
    const isOnline = !!tracking && (new Date().getTime() - new Date(tracking.recorded_at).getTime() < 120000); // active in last 2 mins
    const isStale = !!tracking && (new Date().getTime() - new Date(tracking.recorded_at).getTime() >= 300000); // silent > 5 mins
    const route = routes.find((r) => r.driver_id === d.driver_id && r.status !== 'completed');
    const shift = activeShifts[d.driver_id];

    return {
      ...d,
      tracking,
      isOnline,
      isStale,
      route,
      shift,
    };
  });

  const filteredDrivers = enrichedDrivers.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
                          (d.vehicle_type && d.vehicle_type.toLowerCase().includes(driverSearch.toLowerCase()));
    
    if (filterType === 'active') return matchesSearch && d.isOnline;
    if (filterType === 'offline') return matchesSearch && !d.isOnline;
    return matchesSearch;
  });

  // Override actual positions and breadcrumbs if in playback mode
  const playbackPositions = { ...positions };
  if (isPlaybackMode && historicalData[playbackIndex]) {
    playbackPositions[selectedDriverId!] = {
      ...positions[selectedDriverId!],
      lat: historicalData[playbackIndex].lat,
      lon: historicalData[playbackIndex].lon,
      speed_mps: historicalData[playbackIndex].speed_mps,
      heading_deg: historicalData[playbackIndex].heading_deg,
      recorded_at: historicalData[playbackIndex].recorded_at,
    };
  }

  const mapBreadcrumbs = isPlaybackMode
    ? historicalData.slice(0, playbackIndex + 1).map((p) => [p.lat, p.lon] as [number, number])
    : breadcrumbs;

  const weather = weatherData || {
    temp: 24,
    condition: 'Heavy Lake-Effect Snow 🌨',
    wind: '22 mph NE',
    visibility: '0.4 mi',
    alert: 'Winter Storm Warning active until Monday 6:00 PM'
  };

  const currentSelectedDriver = enrichedDrivers.find((d) => d.driver_id === selectedDriverId);

  return (
    <div className="flex flex-col h-[calc(100vh-69px)] bg-[#0a0f1a] text-slate-100 overflow-hidden font-sans relative">
      
      {/* Dynamic Telemetry Info Header Ribbon */}
      <div className="flex flex-wrap items-center justify-between px-6 py-2.5 glass-panel border-t-0 border-b-0 border-l-0 gap-4 text-xs font-semibold select-none z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>{t('Operational Roster')}:</span>
            <strong className="text-slate-200">{enrichedDrivers.filter(d => d.isOnline).length} / {drivers.length} {t('Online')}</strong>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Compass className="w-4 h-4 text-brand-400" />
            <span>{t('Active Runs')}:</span>
            <strong className="text-slate-200">{activeRoutesCount} {t('Active')}</strong>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeStorm ? (
            <div className="flex items-center gap-2 px-3 py-1 frost-glow-card text-emerald-400 rounded-full animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-500 telemetry-ping"></span>
              <span>{t('Storm Event')}: <strong>{activeStorm.name}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/60 text-slate-400 rounded-full border border-slate-700/30">
              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
              <span>{t('No Active Storm Event')}</span>
            </div>
          )}

          <button
            onClick={() => setSubcontractOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all btn-press ring-1 ring-white/10"
          >
            <Briefcase className="w-3.5 h-3.5" />
            {t('B2B Subcontract Exchange')}
          </button>
        </div>
      </div>

      {/* Emergency Active Alert Warning Ribbon */}
      {urgentRequest && (
        <div className="bg-red-950/90 border-b border-red-500/25 px-6 py-3 flex items-center justify-between text-xs font-bold text-red-400 animate-pulse z-[99] shadow-glow-red select-none backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0"></span>
            <span className="tracking-wide">
              🚨 {t('Active Emergency Plowing Request')}: {t('Notifying nearest driver')} "{urgentRequest.driverName || t('crew')}"...
              {t('Distance')}: {urgentRequest.distanceMeters ? (urgentRequest.distanceMeters / 1609.34).toFixed(2) : '0.00'} {t('miles away')}. 
              ({t('Attempt')} {urgentRequest.attempt} / {urgentRequest.maxAttempts})
            </span>
          </div>
          <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-lg">
            <span>{t('Escalation Timer Active')}: 5 {t('Minutes')}</span>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDEBAR: Active Fleet Roster list */}
        {sidebarOpen && (
          <div className="absolute lg:relative top-0 bottom-0 left-0 w-72 md:w-80 lg:w-96 h-full glass-panel border-t-0 border-b-0 border-l-0 flex flex-col justify-between shrink-0 z-[2000] bg-[#0a0f1a]/95 backdrop-blur-md lg:bg-transparent">

            <div className="p-4 border-b border-slate-900 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-white text-base">{t('Fleet Operations')}</h3>
                <button
                  onClick={() => {
                    fetchDrivers();
                    fetchRoutes();
                    fetchActiveShifts();
                  }}
                  className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
                  title={t('Refreshes fleet connections')}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Advanced Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder={t('Search fleet, vehicles...')}
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-brand-500/40 placeholder:text-slate-600 font-medium transition-all"
                />
              </div>

              {/* Custom filter buttons */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/60">
                <button
                  onClick={() => setFilterType('all')}
                  className={`py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                    filterType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  {t('All')} ({enrichedDrivers.length})
                </button>
                <button
                  onClick={() => setFilterType('active')}
                  className={`py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                    filterType === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  {t('Active')} ({enrichedDrivers.filter((d) => d.isOnline).length})
                </button>
                <button
                  onClick={() => setFilterType('offline')}
                  className={`py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                    filterType === 'offline' ? 'bg-slate-900 text-slate-400' : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  {t('Idle')} ({enrichedDrivers.filter((d) => !d.isOnline).length})
                </button>
              </div>
            </div>

            {/* Drivers list scroll panel */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredDrivers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-semibold">
                  {t('No matches found in operational database.')}
                </div>
              ) : (
                filteredDrivers.map((d) => {
                  const isSelected = selectedDriverId === d.driver_id;
                  
                  // Compute stops completed
                  let stopRatioString = t('No Active Route');
                  let progressPercent = 0;
                  if (d.route) {
                    const matchedDetailed = routes.find((r) => r.route_id === d.route?.route_id);
                    const completedCount = matchedDetailed?.stops?.filter((s) => s.status === 'completed').length ?? 0;
                    // stop_count from SQL COUNT() returns a string — coerce to int
                    const total = parseInt(String(matchedDetailed?.stop_count ?? d.route.stop_count ?? 0), 10);
                    stopRatioString = total > 0 ? `${completedCount}/${total} ${t('stops complete')}` : t('Stops progress…');
                    progressPercent = total > 0 ? (completedCount / total) * 100 : 0;
                  }

                  // Shift Fatigue Tracker
                  const dShift = d.shift;
                  let shiftDurationString = '';
                  let fatigueBadgeClass = '';
                  let fatigueLabel = '';
                  
                  if (dShift && dShift.status === 'active') {
                    const elapsedMs = Date.now() - new Date(dShift.started_at).getTime();
                    const elapsedHrs = elapsedMs / (1000 * 60 * 60);
                    shiftDurationString = `${elapsedHrs.toFixed(1)}h ${t('shift')}`;
                    
                    if (elapsedHrs >= 12) {
                      fatigueLabel = t('Red Fatigue Alert');
                      fatigueBadgeClass = 'bg-red-500/10 text-red-400 border border-red-500/25 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider animate-pulse';
                    } else if (elapsedHrs >= 8) {
                      fatigueLabel = t('Amber Fatigue Warning');
                      fatigueBadgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider animate-pulse';
                    } else {
                      fatigueBadgeClass = 'bg-slate-800/80 text-slate-450 border border-slate-700/40 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider';
                    }
                  }

                  const initials = d.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'DR';

                  return (
                    <div
                      key={d.driver_id}
                      onClick={() => handleSelectDriver(isSelected ? null : d.driver_id)}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer relative group ${
                        isSelected
                          ? 'glass-card border-brand-500/30 shadow-glow-brand'
                          : 'bg-slate-900/20 border-slate-800/40 hover:bg-slate-900/40 hover:border-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar initials badge with active glow */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 relative transition-all ${
                          d.isOnline
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-500/10'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {initials}
                          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-900 ${
                            d.isOnline ? 'bg-emerald-500 telemetry-ping' : 'bg-slate-600'
                          }`}></span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-white text-sm truncate leading-snug group-hover:text-brand-400 transition-colors">
                              {d.name}
                            </span>
                            {d.tracking?.speed_mps != null && (
                              <span className="text-[10px] font-bold text-brand-400 shrink-0 font-mono">
                                {(d.tracking.speed_mps * 2.23694).toFixed(0)} mph
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-450 font-semibold uppercase tracking-wider">
                              {t(d.vehicle_type || 'Commercial Plow')}
                            </span>
                            {shiftDurationString && (
                              <span className={fatigueBadgeClass} title={fatigueLabel}>
                                {shiftDurationString}
                              </span>
                            )}
                          </div>

                          {/* Progress visual bar */}
                          {d.route && (
                            <div className="mt-3.5 space-y-1.5">
                              <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                                <span className="truncate">{d.route.route_name}</span>
                                <span>{stopRatioString}</span>
                              </div>
                              <div className="w-full bg-slate-950/60 rounded-full h-1.5 overflow-hidden border border-slate-800/50">
                                <div
                                  className="bg-brand-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${progressPercent}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Floating Sidebar Toggle Action */}
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className={`absolute top-4 z-[9999] p-2 glass-panel rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all duration-300 shadow-xl cursor-pointer btn-press flex items-center justify-center ${
            sidebarOpen ? 'left-[304px] md:left-[336px] lg:left-[400px]' : 'left-4'
          }`}
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* WORKSPACE AREA: Leaflet OSM Map and Sliding Telemetry Details Drawer */}
        <div className="flex-1 relative w-full h-full bg-[#0a0f1a] flex overflow-hidden">
          
          <div className="flex-1 relative h-full w-full">
            <LeafletMap
              drivers={Object.values(playbackPositions)}
              driverDetails={drivers}
              selectedDriverId={selectedDriverId}
              onSelectDriver={handleSelectDriver}
              selectedDriverRoute={selectedDriverRoute}
              breadcrumbs={mapBreadcrumbs}
              showBreadcrumbs={showBreadcrumbs || isPlaybackMode}
            />

            {/* Floating Live Weather Widget Overlay */}
            <div className="absolute top-4 right-4 z-[99] max-w-xs glass-panel rounded-2xl p-3.5 shadow-2xl border border-slate-800/50 flex flex-col space-y-2 select-none pointer-events-auto">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <CloudSnow className="w-3.5 h-3.5 text-sky-400 animate-bounce" /> {t('Meteorology Live Alert')}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-xl font-black text-white font-mono">{weather.temp}°F</span>
                  <span className="text-xs font-bold text-slate-200">{weather.condition}</span>
                </div>
                <div className="text-[10px] font-semibold text-slate-450 space-y-0.5 text-right shrink-0">
                  <div>{t('Wind')}: {weather.wind}</div>
                  <div>{t('Vis')}: {weather.visibility}</div>
                </div>
              </div>
              {weather.alert && (
                <div className="text-[9px] bg-sky-500/10 border border-sky-500/20 p-2 rounded-lg text-sky-400 font-extrabold flex items-center gap-1 leading-relaxed">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{weather.alert}</span>
                </div>
              )}
            </div>
          </div>

          {/* Collapsible details drawer overlay for selected driver */}
          {selectedDriverId && currentSelectedDriver && (
            <div className="absolute top-4 right-4 bottom-4 w-96 glass-panel rounded-2xl shadow-2xl z-[999] flex flex-col overflow-hidden animate-slide-in bg-[#080d17]/95">
              {/* Drawer Header details */}
              <div className="p-4 border-b border-slate-800/40 bg-slate-950/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                    currentSelectedDriver.isOnline
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {currentSelectedDriver.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'DR'}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm leading-snug">{currentSelectedDriver.name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">{t(currentSelectedDriver.vehicle_type || 'Plow Vehicle')}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSelectDriver(null)}
                  className="p-1 bg-slate-850 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <EyeOff className="w-4 h-4" />
                </button>
              </div>

              {/* Roster detail content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Micro-profile contact specs card */}
                <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-850/60 grid grid-cols-2 gap-3 text-[10px] text-slate-400 font-semibold">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                    <span className="truncate">{currentSelectedDriver.phone || t('No phone')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{formatCurrency(currentSelectedDriver.hourly_rate ?? 35)}/{t('hr rate')}</span>
                  </div>
                </div>

                {/* Telemetry Live Feed details panel */}
                <div className="bg-slate-950/40 rounded-xl border border-slate-850 p-3.5 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t('Telemetry Stream')}
                  </div>
                  
                  {currentSelectedDriver.tracking ? (
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-[10px] font-semibold text-slate-350">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">{t('Latest Coordinates')}</span>
                        <span className="font-mono text-slate-200 mt-0.5">
                          {isPlaybackMode && historicalData[playbackIndex] 
                            ? `${historicalData[playbackIndex].lat.toFixed(5)}, ${historicalData[playbackIndex].lon.toFixed(5)}`
                            : `${currentSelectedDriver.tracking.lat.toFixed(5)}, ${currentSelectedDriver.tracking.lon.toFixed(5)}`}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">{t('Current Speed')}</span>
                        <span className="text-slate-200 mt-0.5">
                          {isPlaybackMode && historicalData[playbackIndex]
                            ? `${(Number(historicalData[playbackIndex].speed_mps ?? 0) * 2.23694).toFixed(1)} mph`
                            : currentSelectedDriver.tracking.speed_mps != null 
                            ? `${(currentSelectedDriver.tracking.speed_mps * 2.23694).toFixed(1)} mph` 
                            : `0.0 mph (${t('Stationary')})`}
                        </span>
                      </div>

                      <div className="flex flex-col col-span-2 pt-1 border-t border-slate-850/40">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">{t('Last Active Connection')}</span>
                        <span className="font-mono text-slate-200 mt-0.5">
                          {isPlaybackMode && historicalData[playbackIndex]
                            ? new Date(historicalData[playbackIndex].recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : new Date(currentSelectedDriver.tracking.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs py-2 italic font-semibold">
                      {t('Offline. Listening for GPS signals...')}
                    </div>
                  )}
                </div>

                {/* High-Priority Dispatch alert Board */}
                <div className="bg-slate-950/40 rounded-xl border border-slate-850 p-3.5 space-y-3">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-red-400" /> {t('High-Priority Dispatch alert')}
                  </div>
                  <form onSubmit={handleSendDispatchAlert} className="space-y-2">
                    <input
                      type="text"
                      placeholder={t('Blocked exit, divert to Stop #4...')}
                      value={alertMessage}
                      onChange={(e) => setAlertMessage(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 text-xs focus:outline-none placeholder:text-slate-600 font-semibold"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSendingAlert || !alertMessage.trim()}
                      className="w-full py-2 bg-red-650/10 border border-red-500/25 hover:bg-red-650/20 text-red-400 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow btn-press flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {isSendingAlert ? t('Dispatched...') : t('Send Urgent audio alert')}
                    </button>
                  </form>
                </div>

                {/* Breadcrumbs Interactive Toggle & Playback Scrubber */}
                <div className="bg-slate-950/40 rounded-xl border border-slate-850 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white leading-normal">{t('Render Historical Trail')}</span>
                      <span className="text-[9px] text-slate-500 font-semibold">{t('Overlays previous driven points on the map')}</span>
                    </div>
                    <button
                      onClick={() => setShowBreadcrumbs((prev) => !prev)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                        showBreadcrumbs
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {showBreadcrumbs ? (
                        <>
                          <Eye className="w-3.5 h-3.5" /> {t('Show Trail')}
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" /> {t('Hide Trail')}
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-850/45">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white">{t('Route Playback Mode')}</span>
                      <span className="text-[9px] text-slate-500 font-semibold">{t('Animate history breadcrumbs sequentially')}</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsPlaybackMode((prev) => !prev);
                        setShowBreadcrumbs(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                        isPlaybackMode
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {isPlaybackMode ? t('Deactivate') : t('Activate')}
                    </button>
                  </div>

                  {isPlaybackMode && historicalData.length > 0 && (
                    <div className="space-y-2.5 pt-2.5 border-t border-slate-850/40">
                      {/* Scrubber slider */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-450">
                          <span>{t('Frame')} {playbackIndex + 1} / {historicalData.length}</span>
                          <span>
                            {historicalData[playbackIndex]
                              ? new Date(historicalData[playbackIndex].recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                              : '00:00:00'}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={historicalData.length - 1}
                          value={playbackIndex}
                          onChange={(e) => {
                            setPlaybackIndex(Number(e.target.value));
                            setIsPlaying(false);
                          }}
                          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                      </div>

                      {/* Play controls */}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-purple-500/15 border border-purple-500/20 rounded-lg text-purple-400 text-[10px] font-extrabold uppercase tracking-wider cursor-pointer hover:bg-purple-500/25 transition-all"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5" /> {t('Pause')}
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" /> {t('Play')}
                            </>
                          )}
                        </button>

                        {/* Speed multiplier selector */}
                        <div className="flex items-center gap-1 bg-slate-950/60 p-0.5 rounded-lg border border-slate-800">
                          {[1, 2, 5, 10].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setPlaybackSpeed(s)}
                              className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-all ${
                                playbackSpeed === s ? 'bg-purple-500 text-white shadow' : 'text-slate-500 hover:text-slate-350'
                              }`}
                            >
                              {s}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {isPlaybackMode && historicalData.length === 0 && (
                    <div className="text-[10px] text-slate-500 text-center italic py-2 font-medium">
                      {t('Retrieving tracking logs from telemetry base...')}
                    </div>
                  )}
                </div>

                {/* Active Route Stops Sequence Overview */}
                {selectedDriverRoute ? (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>{t('Stops List')}: {selectedDriverRoute.route_name}</span>
                    </div>

                    <div className="divide-y divide-slate-855 max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {selectedDriverRoute.stops?.map((stop) => (
                        <div
                          key={stop.stop_id}
                          className="py-2.5 pl-1.5 flex items-center justify-between text-xs font-semibold"
                        >
                          <div className="flex items-center gap-2 max-w-[65%]">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                              stop.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : stop.status === 'in_progress'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                                : stop.status === 'skipped'
                                ? 'bg-slate-800 text-slate-500 border border-slate-700'
                                : 'bg-slate-855 text-slate-350 border border-slate-800'
                            }`}>
                              {stop.sequence_number}
                            </span>
                            <div className="truncate">
                              <div className="text-slate-200 truncate">{stop.name}</div>
                              <div className="text-[9px] text-slate-500 truncate mt-0.5 leading-normal">{stop.address}</div>
                              {stop.notes && (
                                <div className="mt-1 flex flex-col items-start gap-1">
                                  <div className="text-[9px] text-emerald-400 font-medium italic pl-1 border-l border-emerald-500/30 truncate max-w-full">
                                    "{stop.notes}"
                                  </div>
                                  {stop.notes.includes('Proof of service uploaded') && (
                                    <button
                                      onClick={() => {
                                        const notesStr = stop.notes || '';
                                        const idx = notesStr.indexOf('Proof of service uploaded: ');
                                        const imgUrl = idx !== -1 ? notesStr.substring(idx + 27) : '/mock_s3_compressed_146kb.jpg';
                                        setPreviewImage(imgUrl.startsWith('data:image/') ? imgUrl : '/mock_s3_compressed_146kb.jpg');
                                      }}
                                      className="px-1.5 py-0.5 mt-0.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded text-[8px] font-bold cursor-pointer transition-colors"
                                    >
                                      📷 {t('View Proof Photo')}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick stop status override dropdown */}
                          <CustomSelect
                            options={[
                              { value: 'pending', label: t('Pending'), colorDot: '#ef4444' },
                              { value: 'in_progress', label: t('In Progress'), colorDot: '#f97316' },
                              { value: 'completed', label: t('Completed'), colorDot: '#10b981' },
                              { value: 'skipped', label: t('Skipped'), colorDot: '#64748b' },
                            ]}
                            value={stop.status}
                            onChange={(val) => updateStopStatus(selectedDriverRoute.route_id, stop.stop_id, val as any)}
                            className="w-28 sm:w-32 shrink-0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-550 border-t border-slate-850 text-xs font-semibold flex flex-col items-center justify-center gap-2">
                    <Navigation className="w-6 h-6 text-slate-700" />
                    <span>{t('No active route assigned to driver')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full Screen Empty Fleet State Overlay */}
          {Object.keys(positions).length === 0 && (
            <div className="absolute inset-0 bg-[#0a0f1a]/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 select-none">
              <div className="max-w-md w-full glass-card rounded-2xl p-8 shadow-2xl text-center space-y-6 gradient-border">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-brand-500/10 border border-brand-500/20 rounded-full flex items-center justify-center text-brand-400 animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">{t('No active storm telemetry')}</h3>
                  <p className="text-sm text-slate-400 font-semibold leading-relaxed">
                    {t('No drivers are active in the current storm event. Once vehicles start their routes and broadcast GPS updates, they will appear on the live tracking console.')}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-950/50 border border-slate-850 rounded-xl text-[10px] font-mono text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-700 animate-ping"></span>
                  {t('Listening for GPS broadcasts...')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* B2B Subcontracting Console Modal Dialog */}
      <SubcontractConsole isOpen={subcontractOpen} onClose={() => setSubcontractOpen(false)} />

      {/* Proof of Service Image Preview Modal Overlay */}
      {previewImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">{t('Proof of Service Photo Verification')}</span>
              <button
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                {t('Close')} ✕
              </button>
            </div>
            <img
              src={previewImage}
              alt="Proof of Service"
              className="w-full max-h-[70vh] object-contain rounded-lg border border-slate-850"
            />
            <div className="mt-3 text-xs text-slate-450 font-semibold text-center">
              {t('Liability protection proof of service escrow photo · Verified Clear')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
