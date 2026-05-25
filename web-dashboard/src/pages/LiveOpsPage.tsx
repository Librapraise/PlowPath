import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useDriversStore } from '../store/driversStore';
import { useRoutesStore, type Route } from '../store/routesStore';
import { useStormsStore } from '../store/stormsStore';
import LeafletMap from '../components/Map/LeafletMap';
import CustomSelect from '../components/CustomSelect';
import {
  Search, ShieldAlert, Clock, Compass, Truck, Phone, Navigation,
  ChevronLeft, ChevronRight, RefreshCw, Eye, EyeOff, CheckCircle2,
  TrendingUp, MapPin, User, DollarSign, Activity
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
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);

  const { drivers, fetchDrivers } = useDriversStore();
  const { routes, fetchRoutes, fetchRouteDetails, currentRoute, updateStopStatus } = useRoutesStore();
  const { storms, fetchStorms } = useStormsStore();

  const [positions, setPositions] = useState<Record<string, DriverPosition>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [urgentRequest, setUrgentRequest] = useState<any>(null);

  // UX controls
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
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
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);


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
      if (selectedDriverId === p.driver_id && showBreadcrumbs) {
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

    return () => {
      socket.disconnect();
    };
  }, [token, selectedDriverId, showBreadcrumbs]);

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
    if (selectedDriverId && showBreadcrumbs) {
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
  }, [selectedDriverId, showBreadcrumbs]);

  // Statistics calculation
  const onlineDriverIds = Object.keys(positions);
  const activeStorm = storms.find((s) => s.status === 'active');
  const activeRoutesCount = routes.filter((r) => r.status === 'in_progress').length;

  const handleSelectDriver = (driverId: string | null) => {
    setSelectedDriverId(driverId);
  };

  // Compile full driver records with tracking metadata
  const enrichedDrivers = drivers.map((d) => {
    const tracking = positions[d.driver_id];
    const isOnline = !!tracking && (new Date().getTime() - new Date(tracking.recorded_at).getTime() < 120000); // active in last 2 mins
    const route = routes.find((r) => r.driver_id === d.driver_id && r.status !== 'completed');

    return {
      ...d,
      tracking,
      isOnline,
      route,
    };
  });

  const filteredDrivers = enrichedDrivers.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
                          (d.vehicle_type && d.vehicle_type.toLowerCase().includes(driverSearch.toLowerCase()));
    
    if (filterType === 'active') return matchesSearch && d.isOnline;
    if (filterType === 'offline') return matchesSearch && !d.isOnline;
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0f1a] text-slate-100 p-6 font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-brand-500/[0.06] blur-[120px] pointer-events-none"></div>
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute w-24 h-24 rounded-full bg-brand-500/15 animate-ping opacity-75"></div>
          <div className="absolute w-16 h-16 rounded-full bg-brand-500/25 animate-pulse"></div>
          <div className="w-12 h-12 rounded-full border-4 border-brand-400 border-t-transparent animate-spin"></div>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white mb-2 animate-pulse relative">
          Synchronizing Live Fleet Telemetry
        </h2>
        <p className="text-sm text-slate-400 max-w-xs text-center font-medium relative">
          Connecting to PlowPath telemetry stream and retrieving latest active GPS signals...
        </p>
      </div>
    );
  }

  // Active selected driver details
  const currentSelectedDriver = enrichedDrivers.find((d) => d.driver_id === selectedDriverId);

  return (
    <div className="flex flex-col h-[calc(100vh-69px)] bg-[#0a0f1a] text-slate-100 overflow-hidden font-sans relative">
      
      {/* Dynamic Telemetry Info Header Ribbon */}
      <div className="flex flex-wrap items-center justify-between px-6 py-2.5 glass-panel border-t-0 border-l-0 border-r-0 gap-4 text-xs font-semibold select-none z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Operational Roster:</span>
            <strong className="text-slate-200">{enrichedDrivers.filter(d => d.isOnline).length} / {drivers.length} Online</strong>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Compass className="w-4 h-4 text-brand-400" />
            <span>Active Runs:</span>
            <strong className="text-slate-200">{activeRoutesCount} Active</strong>
          </div>
        </div>

        {activeStorm ? (
          <div className="flex items-center gap-2 px-3 py-1 frost-glow-card text-emerald-400 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500 telemetry-ping"></span>
            <span>Storm Event: <strong>{activeStorm.name}</strong></span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-800/60 text-slate-400 rounded-full border border-slate-700/30">
            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
            <span>No Active Storm Event</span>
          </div>
        )}
      </div>

      {/* Emergency Active Alert Warning Ribbon */}
      {urgentRequest && (
        <div className="bg-red-950/90 border-b border-red-500/25 px-6 py-3 flex items-center justify-between text-xs font-bold text-red-400 animate-pulse z-[99] shadow-glow-red select-none backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0"></span>
            <span className="tracking-wide">
              🚨 ACTIVE EMERGENCY PLOWING REQUEST: Notifying nearest driver "{urgentRequest.driverName || 'crew'}"...
              Distance: {urgentRequest.distanceMeters ? (urgentRequest.distanceMeters / 1609.34).toFixed(2) : '0.00'} miles away. 
              (Attempt {urgentRequest.attempt} / {urgentRequest.maxAttempts})
            </span>
          </div>
          <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-lg">
            <span>Escalation Timer Active: 5 Minutes</span>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* SIDEBAR: Active Fleet Roster list */}
        {sidebarOpen && (
          <div className="absolute lg:relative top-0 bottom-0 left-0 w-72 md:w-80 lg:w-96 h-full glass-panel border-t-0 border-b-0 border-l-0 flex flex-col justify-between shrink-0 z-[2000] bg-[#0a0f1a]/95 backdrop-blur-md lg:bg-transparent">

            <div className="p-4 border-b border-slate-900 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-white text-base">Fleet Operations</h3>
                <button
                  onClick={() => {
                    fetchDrivers();
                    fetchRoutes();
                  }}
                  className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
                  title="Refreshes fleet connections"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Advanced Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search fleet, vehicles..."
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
                  All ({enrichedDrivers.length})
                </button>
                <button
                  onClick={() => setFilterType('active')}
                  className={`py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                    filterType === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Active ({enrichedDrivers.filter((d) => d.isOnline).length})
                </button>
                <button
                  onClick={() => setFilterType('offline')}
                  className={`py-1 text-[10px] font-extrabold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                    filterType === 'offline' ? 'bg-slate-900 text-slate-400' : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Idle ({enrichedDrivers.filter((d) => !d.isOnline).length})
                </button>
              </div>
            </div>

            {/* Drivers list scroll panel */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredDrivers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-semibold">
                  No matches found in operational database.
                </div>
              ) : (
                filteredDrivers.map((d) => {
                  const isSelected = selectedDriverId === d.driver_id;
                  
                  // Compute stops completed
                  let stopRatioString = 'No Active Route';
                  let progressPercent = 0;
                  if (d.route) {
                    const matchedDetailed = routes.find((r) => r.route_id === d.route?.route_id);
                    const completed = matchedDetailed?.stops?.filter((s) => s.status === 'completed').length ?? 0;
                    const total = matchedDetailed?.stop_count ?? d.route.stop_count ?? 0;
                    stopRatioString = total > 0 ? `${completed}/${total} stops complete` : 'Stops progress…';
                    progressPercent = total > 0 ? (completed / total) * 100 : 0;
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
                          
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5 truncate uppercase tracking-wider">
                            {d.vehicle_type || 'Commercial Plow'}
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
              drivers={Object.values(positions)}
              driverDetails={drivers}
              selectedDriverId={selectedDriverId}
              onSelectDriver={handleSelectDriver}
              selectedDriverRoute={selectedDriverRoute}
              breadcrumbs={breadcrumbs}
              showBreadcrumbs={showBreadcrumbs}
            />
          </div>

          {/* Collapsible details overlay for selected driver */}
          {selectedDriverId && currentSelectedDriver && (
            <div className="absolute top-4 right-4 bottom-4 w-96 glass-panel rounded-2xl shadow-2xl z-[999] flex flex-col overflow-hidden animate-slide-in">
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
                    <p className="text-[10px] text-slate-400 font-semibold">{currentSelectedDriver.vehicle_type || 'Plow Vehicle'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDriverId(null)}
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
                    <span className="truncate">{currentSelectedDriver.phone || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>${currentSelectedDriver.hourly_rate ?? 35}/hr rate</span>
                  </div>
                </div>

                {/* Telemetry Live Feed details panel */}
                <div className="bg-slate-950/40 rounded-xl border border-slate-850 p-3.5 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Telemetry Stream
                  </div>
                  
                  {currentSelectedDriver.tracking ? (
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 text-[10px] font-semibold text-slate-350">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Latest Coordinates</span>
                        <span className="font-mono text-slate-200 mt-0.5">
                          {currentSelectedDriver.tracking.lat.toFixed(5)}, {currentSelectedDriver.tracking.lon.toFixed(5)}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Current Speed</span>
                        <span className="text-slate-200 mt-0.5">
                          {currentSelectedDriver.tracking.speed_mps != null 
                            ? `${(currentSelectedDriver.tracking.speed_mps * 2.23694).toFixed(1)} mph` 
                            : '0.0 mph (Stationary)'}
                        </span>
                      </div>

                      <div className="flex flex-col col-span-2 pt-1 border-t border-slate-850/40">
                        <span className="text-[9px] text-slate-500 font-bold uppercase">Last Active Connection</span>
                        <span className="font-mono text-slate-200 mt-0.5">
                          {new Date(currentSelectedDriver.tracking.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs py-2 italic font-semibold">
                      Offline. Listening for GPS signals...
                    </div>
                  )}
                </div>

                {/* Breadcrumbs Interactive Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-850 rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-white leading-normal">Render Historical Trail</span>
                    <span className="text-[9px] text-slate-500 font-semibold">Overlays previous driven points on the map</span>
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
                        <Eye className="w-3.5 h-3.5" /> Show Trail
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Hide Trail
                      </>
                    )}
                  </button>
                </div>

                {/* Active Route Stops Sequence Overview */}
                {selectedDriverRoute ? (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Stops List: {selectedDriverRoute.route_name}</span>
                    </div>

                    <div className="divide-y divide-slate-850 max-h-56 overflow-y-auto space-y-1.5 pr-1">
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
                                : 'bg-slate-850 text-slate-350 border border-slate-800'
                            }`}>
                              {stop.sequence_number}
                            </span>
                            <div className="truncate">
                              <div className="text-slate-200 truncate">{stop.name}</div>
                              <div className="text-[9px] text-slate-500 truncate mt-0.5 leading-normal">{stop.address}</div>
                            </div>
                          </div>

                          {/* Quick stop status override dropdown */}
                          <CustomSelect
                            options={[
                              { value: 'pending', label: 'Pending', colorDot: '#ef4444' },
                              { value: 'in_progress', label: 'In Progress', colorDot: '#f97316' },
                              { value: 'completed', label: 'Completed', colorDot: '#10b981' },
                              { value: 'skipped', label: 'Skipped', colorDot: '#64748b' },
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
                    <span>No active route assigned to driver</span>
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
                  <h3 className="text-xl font-bold text-white">No active storm telemetry</h3>
                  <p className="text-sm text-slate-400 font-semibold leading-relaxed">
                    No drivers are active in the current storm event. Once vehicles start their routes and broadcast GPS updates, they will appear on the live tracking console.
                  </p>
                </div>

                <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-slate-950/50 border border-slate-850 rounded-xl text-[10px] font-mono text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-slate-700 animate-ping"></span>
                  Listening for GPS broadcasts...
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
