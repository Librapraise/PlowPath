import { useEffect, useState } from 'react';
import { useRoutesStore, type Route, type RouteStop } from '../store/routesStore';
import { useStormsStore } from '../store/stormsStore';
import { useDriversStore } from '../store/driversStore';
import { useCustomersStore } from '../store/customersStore';
import { useToastStore } from '../store/toastStore';
import { Plus, Navigation, MapPin, Eye, Search, Check, ShieldAlert, Clock, Compass, Truck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import RoutePolyline from '../components/Map/RoutePolyline';

// Leaflet map center utility
function FocusRouteMap({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

// Markers styles for different stop statuses
const getStopIcon = (status: RouteStop['status'], seq: number) => {
  let color = '#ef4444'; // pending - red
  if (status === 'in_progress') color = '#f97316'; // in_progress - orange
  if (status === 'completed') color = '#10b981'; // completed - green
  if (status === 'skipped') color = '#64748b'; // skipped - gray

  return L.divIcon({
    className: `plowpath-stop-marker-${status}`,
    html: `
      <div style="
        width: 26px; height: 26px; border-radius: 50%;
        background: ${color}; border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        display: flex; items-center; justify-content: center;
        color: white; font-weight: 800; font-size: 11px;
        line-height: 20px; text-align: center;
      ">${seq}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

export default function RoutesPage() {
  const { routes, currentRoute, isLoading, fetchRoutes, fetchRouteDetails, generateRoute, updateStopStatus, broadcastSms } = useRoutesStore();
  const { storms, fetchStorms } = useStormsStore();
  const { drivers, fetchDrivers } = useDriversStore();
  const { customers, fetchCustomers, setFilters } = useCustomersStore();

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Wizard Fields
  const [stormId, setStormId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [routeName, setRouteName] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [custSearch, setCustSearch] = useState('');
  const [customStart, setCustomStart] = useState(false);
  const [startLat, setStartLat] = useState('42.8864'); // Default Buffalo center
  const [startLon, setStartLon] = useState('-78.8784');

  // Broadcast SMS Fields
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleTemplateChange = (val: string) => {
    setSelectedTemplate(val);
    if (val === 'pre_storm') {
      setBroadcastMessage('PlowPath: Winter storm warnings are active. We are preparing routes. Please reply SKIP if you do not want clearing for this event.');
    } else if (val === 'en_route') {
      setBroadcastMessage('PlowPath: Crews are active in your neighborhood. Please keep driveways clear of parked vehicles for thorough plowing.');
    } else if (val === 'delay') {
      setBroadcastMessage('PlowPath: Due to extreme winter storm conditions, crews are experiencing heavy weather delays. We appreciate your patience.');
    } else {
      setBroadcastMessage('');
    }
  };

  const handleSendBroadcast = async () => {
    if (!currentRoute) return;
    if (!broadcastMessage.trim()) return;
    setIsBroadcasting(true);
    try {
      await broadcastSms(currentRoute.route_id, broadcastMessage);
      setBroadcastMessage('');
      setSelectedTemplate('custom');
    } catch {
      // Handled by store
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Trigger loading collections
  useEffect(() => {
    fetchRoutes();
    fetchStorms();
    fetchDrivers();
    // Load up to 200 customers for selection
    setFilters({ page: 1 });
  }, []);

  // Fetch detail when selecting a route
  useEffect(() => {
    if (selectedRouteId) {
      fetchRouteDetails(selectedRouteId);
    }
  }, [selectedRouteId]);

  const toggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stormId || !driverId || !routeName || selectedCustomerIds.length === 0) {
      useToastStore.getState().addToast('Please fill out all wizard fields and pick at least 1 customer', 'warning');
      return;
    }

    const payload: any = {
      storm_id: stormId,
      driver_id: driverId,
      route_name: routeName,
      customer_ids: selectedCustomerIds,
    };

    if (customStart) {
      payload.start_lat = parseFloat(startLat);
      payload.start_lon = parseFloat(startLon);
    }

    try {
      await generateRoute(payload);
      setWizardOpen(false);
      // Auto select first route
      setSelectedRouteId(null);
    } catch {
      // Handled
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.status === 'active' &&
      (c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
        c.address.toLowerCase().includes(custSearch.toLowerCase()))
  );

  // Setup Map bounds and positions
  let bounds: L.LatLngBounds | null = null;
  let polylinePositions: Array<[number, number]> = [];

  if (currentRoute) {
    // Parse OSRM geometry coordinates ([lon, lat] -> [lat, lon])
    const geom = currentRoute.osrm_geometry;
    if (geom && typeof geom === 'object' && geom.coordinates) {
      polylinePositions = geom.coordinates.map((c: any) => [c[1], c[0]]);
    }

    // Accumulate LatLngs to fit bounds
    const points: L.LatLngExpression[] = [];
    if (polylinePositions.length > 0) {
      polylinePositions.forEach((p) => points.push(p));
    }
    if (currentRoute.stops) {
      currentRoute.stops.forEach((s) => points.push([s.lat, s.lon]));
    }

    if (points.length > 0) {
      bounds = L.latLngBounds(points);
    }
  }

  return (
    <div className="h-[calc(100vh-69px)] flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR: Routes Roster List */}
      <div className="w-full md:w-80 border-r border-slate-900 bg-slate-900/40 flex flex-col justify-between shrink-0">
        <div className="p-4 border-b border-slate-900 flex items-center justify-between">
          <h3 className="font-extrabold text-white text-base">Storm Routes</h3>
          <button
            onClick={() => {
              setStormId(storms.find((s) => s.status === 'active')?.storm_id || '');
              setDriverId('');
              setRouteName(`Route - ${new Date().toLocaleDateString()}`);
              setSelectedCustomerIds([]);
              setWizardOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-650 hover:bg-brand-550 text-white text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95 shadow-md shadow-brand-500/10"
          >
            <Plus className="w-4 h-4" /> New Route
          </button>
        </div>

        {/* Routes Scroll List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {routes.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              No routes generated yet. Let's create your first optimized route!
            </div>
          ) : (
            routes.map((r) => {
              const driver = drivers.find((d) => d.driver_id === r.driver_id);
              const storm = storms.find((s) => s.storm_id === r.storm_id);
              const isSelected = selectedRouteId === r.route_id;

              return (
                <div
                  key={r.route_id}
                  onClick={() => setSelectedRouteId(r.route_id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-900 border-brand-500/30 shadow-lg shadow-brand-500/5'
                      : 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/80 hover:border-slate-800'
                  }`}
                >
                  <h4 className="font-bold text-white text-sm leading-snug">{r.route_name}</h4>
                  <div className="text-[10px] font-bold text-brand-400 mt-1 uppercase tracking-widest">
                    Driver: {driver?.name || 'Unassigned'}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/40 text-[10px] text-slate-400 font-semibold">
                    <div className="flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-slate-550" />
                      <span>{r.total_distance.toFixed(1)} miles</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-550" />
                      <span>{r.stop_count || 0} stops</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT WORKSPACE: Detail & Polyline Map */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-hidden relative">
        {currentRoute ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Renders details header */}
            <div className="p-4 bg-slate-900/60 border-b border-slate-900 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white">{currentRoute.route_name}</h3>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-semibold">
                  <span>Storm: <strong className="text-slate-200">{storms.find((s) => s.storm_id === currentRoute.storm_id)?.name || 'Storm'}</strong></span>
                  <span className="text-slate-600">•</span>
                  <span>Driver: <strong className="text-brand-400">{drivers.find((d) => d.driver_id === currentRoute.driver_id)?.name || 'Driver'}</strong></span>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-4 text-xs font-mono font-bold">
                <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
                  Total Miles: {currentRoute.total_distance.toFixed(2)}
                </span>
                {currentRoute.status === 'assigned' && (
                  <span className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full">
                    Assigned
                  </span>
                )}
                {currentRoute.status === 'in_progress' && (
                  <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full animate-pulse">
                    En Route
                  </span>
                )}
                {currentRoute.status === 'completed' && (
                  <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full">
                    Completed
                  </span>
                )}
              </div>
            </div>

            {/* Split Map and Stops Table */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Side: Leaflet OSM Map */}
              <div className="flex-1 relative min-h-[300px] lg:min-h-0 bg-slate-900">
                <MapContainer
                  center={[42.8864, -78.8784]}
                  zoom={12}
                  style={{ height: '100%', width: '100%', zIndex: 0 }}
                >
                  <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                  
                  {/* Route Polyline path */}
                  {polylinePositions.length > 0 && (
                    <RoutePolyline positions={polylinePositions} color="#38b0f8" />
                  )}

                  {/* Stop Markers */}
                  {currentRoute.stops?.map((s) => (
                    <Marker key={s.stop_id} position={[s.lat, s.lon]} icon={getStopIcon(s.status, s.sequence_number)}>
                      <Popup>
                        <div className="font-sans text-xs space-y-1">
                          <div className="font-bold text-slate-950 text-sm">#{s.sequence_number} {s.name}</div>
                          <div className="text-slate-500">{s.address}</div>
                          {s.access_notes && (
                            <div className="bg-slate-100 p-1.5 rounded border text-[10px] text-amber-800">
                              <strong>Notes:</strong> {s.access_notes}
                            </div>
                          )}
                          <div className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Status: {s.status}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  <FocusRouteMap bounds={bounds} />
                </MapContainer>
              </div>

              {/* Right Side: Stops List */}
              <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-900 bg-slate-900/30 flex flex-col overflow-hidden">
                <div className="p-3.5 border-b border-slate-900 bg-slate-900/80 font-extrabold text-xs uppercase tracking-widest text-slate-400">
                  Optimized Stop Sequence
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1.5">
                  {currentRoute.stops?.map((stop) => (
                    <div key={stop.stop_id} className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl hover:border-slate-800 transition-all text-xs font-semibold">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center font-black ${
                            stop.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : stop.status === 'in_progress'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                              : stop.status === 'skipped'
                              ? 'bg-slate-850 text-slate-500 border border-slate-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {stop.sequence_number}
                          </span>
                          <span className="font-bold text-slate-200">{stop.name}</span>
                        </span>

                        {/* Dispatch Status Override Dropdown */}
                        <select
                          value={stop.status}
                          onChange={(e) => updateStopStatus(currentRoute.route_id, stop.stop_id, e.target.value as any)}
                          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-md text-[10px] font-bold text-slate-350 focus:outline-none focus:border-brand-500 cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="skipped">Skipped</option>
                        </select>
                      </div>
                      
                      <div className="text-[10px] text-slate-450 mt-1 pl-7 font-medium leading-relaxed truncate">
                        {stop.address}
                      </div>

                      {/* Notes / Completion indicators */}
                      {(stop.arrival_time || stop.completion_time) && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/40 pl-7 text-[9px] font-mono text-slate-500 space-y-0.5">
                          {stop.arrival_time && <div>Arrival: {new Date(stop.arrival_time).toLocaleTimeString()}</div>}
                          {stop.completion_time && <div>Done: {new Date(stop.completion_time).toLocaleTimeString()}</div>}
                        </div>
                      )}
                      
                      {stop.notes && (
                        <div className="mt-2 bg-slate-950/60 p-2 rounded-lg border border-slate-850 pl-2 text-[10px] text-slate-400 italic">
                          "{stop.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Broadcast Panel */}
                <div className="p-4 border-t border-slate-900 bg-slate-900/50 space-y-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      SMS Broadcast Tool 📣
                    </span>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="px-2 py-1 bg-slate-950 border border-slate-850 rounded-md text-[10px] font-bold text-slate-350 focus:outline-none cursor-pointer"
                    >
                      <option value="custom">Custom Text</option>
                      <option value="pre_storm">Pre-Storm Template</option>
                      <option value="en_route">Active Neighbor Template</option>
                      <option value="delay">Storm Delay Template</option>
                    </select>
                  </div>
                  
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => {
                      setSelectedTemplate('custom');
                      setBroadcastMessage(e.target.value);
                    }}
                    placeholder="Enter custom broadcast message to send to all route contacts..."
                    rows={3}
                    maxLength={160}
                    className="w-full p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-brand-500/50 resize-none"
                  />
                  
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span>Character Limit: {broadcastMessage.length}/160</span>
                    <span>Bypasses Hourly Limit</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSendBroadcast}
                    disabled={isBroadcasting || !broadcastMessage.trim()}
                    className="w-full py-2 bg-gradient-to-r from-brand-650 to-indigo-650 hover:from-brand-550 hover:to-indigo-550 disabled:opacity-40 text-white font-bold text-xs rounded-lg shadow transition-all active:scale-98 cursor-pointer"
                  >
                    {isBroadcasting ? 'Broadcasting SMS...' : 'Send SMS Broadcast'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-600 animate-bounce">
              <Navigation className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-200">No active route selected</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Select an optimized route from the left sidebar panel or generate a new optimized one using the wizard.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Route Generation Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setWizardOpen(false)}></div>
          <div className="relative bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 sm:p-8 animate-slide-in space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-brand-400" /> Route Optimizer Wizard
            </h3>

            <form onSubmit={handleGenerate} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    1. Select Storm Event
                  </label>
                  <select
                    required
                    value={stormId}
                    onChange={(e) => setStormId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-sm focus:outline-none"
                  >
                    <option value="">Choose Active/Planned Storm</option>
                    {storms.filter((s) => s.status !== 'completed' && s.status !== 'cancelled').map((s) => (
                      <option key={s.storm_id} value={s.storm_id}>
                        {s.name} ({s.status.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                    2. Select Driver
                  </label>
                  <select
                    required
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-350 text-sm focus:outline-none"
                  >
                    <option value="">Choose Active Operator</option>
                    {drivers.filter((d) => d.status === 'active').map((d) => (
                      <option key={d.driver_id} value={d.driver_id}>
                        {d.name} ({d.vehicle_type || 'Truck'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  Route Name
                </label>
                <input
                  type="text"
                  required
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="e.g. North Buffalo Commercial Route A"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none"
                />
              </div>

              {/* Starting Coordinates toggle */}
              <div className="space-y-2 border-t border-slate-850 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Set Custom Starting Point?</span>
                  <input
                    type="checkbox"
                    checked={customStart}
                    onChange={(e) => setCustomStart(e.target.checked)}
                    className="w-4 h-4 text-brand-500 rounded border-slate-800 bg-slate-950"
                  />
                </div>
                {customStart && (
                  <div className="grid grid-cols-2 gap-4 animate-slide-in">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 mb-1">Start Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={startLat}
                        onChange={(e) => setStartLat(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 mb-1">Start Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={startLon}
                        onChange={(e) => setStartLon(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Customer Multi-Select checkbox list */}
              <div className="border-t border-slate-850 pt-4 flex flex-col h-64">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  3. Select Servicing Properties ({selectedCustomerIds.length} chosen)
                </label>
                
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search properties by name/address..."
                    value={custSearch}
                    onChange={(e) => setCustSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none placeholder:text-slate-600"
                  />
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-850 rounded-xl p-2 divide-y divide-slate-850 space-y-1 bg-slate-950/40">
                  {filteredCustomers.map((c) => {
                    const isChecked = selectedCustomerIds.includes(c.customer_id);
                    return (
                      <div
                        key={c.customer_id}
                        onClick={() => toggleCustomer(c.customer_id)}
                        className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer text-xs font-semibold ${
                          isChecked ? 'bg-brand-500/10 text-brand-400' : 'text-slate-300 hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="max-w-[85%]">
                          <div className="font-bold">{c.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{c.address}</div>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isChecked ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-800'
                        }`}>
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                  {filteredCustomers.length === 0 && (
                    <div className="text-center py-10 text-slate-600 text-xs">
                      No active customers match the description.
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-sm rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || selectedCustomerIds.length === 0}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/15 transition-all active:scale-95 cursor-pointer"
                >
                  {isLoading ? 'Optimizing path...' : 'Generate & Optimize Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
