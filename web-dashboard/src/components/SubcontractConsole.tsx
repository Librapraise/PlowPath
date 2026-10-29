import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { useDriversStore } from '../store/driversStore';
import { useRoutesStore, type Route, type RouteStop } from '../store/routesStore';
import { 
  Briefcase, Send, Users, Shield, Globe, DollarSign, List, 
  MapPin, CheckCircle, ArrowRight, Eye, ShieldAlert, X
} from 'lucide-react';
import CustomSelect from './CustomSelect';

interface SubcontractConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActiveOffer {
  id: string;
  origin_org_id: string;
  target_org_id: string | null;
  offered_payout: string;
  status: string;
  created_at: string;
  origin_company_name: string;
  stop_count: string;
}

interface OfferStopDetails {
  id: string;
  offer_id: string;
  route_stop_id: string;
  accepted_by_org_id: string | null;
  assigned_driver_id: string | null;
  completed_at: string | null;
  original_stop_status: string;
  customer_name: string;
  customer_address: string;
  latitude: number;
  longitude: number;
}

export default function SubcontractConsole({ isOpen, onClose }: SubcontractConsoleProps) {
  const { routes, fetchRoutes } = useRoutesStore();
  const { drivers, fetchDrivers } = useDriversStore();

  const [activeTab, setActiveTab] = useState<'broadcast' | 'marketplace'>('broadcast');

  // Broadcast Offer State
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [selectedStopIds, setSelectedStopIds] = useState<string[]>([]);
  const [payoutRate, setPayoutRate] = useState<string>('');
  const [targetOrgId, setTargetOrgId] = useState<string>('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [organizations, setOrganizations] = useState<Array<{ settings_id: string; company_name: string }>>([]);

  // Marketplace (Competitor Broadcasts) State
  const [activeOffers, setActiveOffers] = useState<ActiveOffer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<ActiveOffer | null>(null);
  const [offerStops, setOfferStops] = useState<OfferStopDetails[]>([]);
  const [isLoadingStops, setIsLoadingStops] = useState(false);

  // Accepting Offer State
  const [acceptRouteId, setAcceptRouteId] = useState<string>('');
  const [acceptDriverId, setAcceptDriverId] = useState<string>('');
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRoutes();
      fetchDrivers();
      loadOrganizations();
      loadActiveOffers();
    }
  }, [isOpen]);

  // Load stops when a route is selected for broadcasting
  useEffect(() => {
    if (selectedRouteId) {
      const selectedRoute = routes.find(r => r.route_id === selectedRouteId);
      if (selectedRoute && selectedRoute.stops) {
        setRouteStops(selectedRoute.stops.filter(s => s.status === 'pending' || s.status === 'in_progress'));
      } else {
        // Try fetching route details to ensure stops are populated
        api.get(`/routes/${selectedRouteId}`).then(({ data }) => {
          setRouteStops(data.stops?.filter((s: any) => s.status === 'pending' || s.status === 'in_progress') || []);
        }).catch(() => {
          setRouteStops([]);
        });
      }
      setSelectedStopIds([]);
    } else {
      setRouteStops([]);
      setSelectedStopIds([]);
    }
  }, [selectedRouteId, routes]);

  // Load stops of the selected marketplace offer
  useEffect(() => {
    if (selectedOffer) {
      setIsLoadingStops(true);
      api.get(`/subcontracts/${selectedOffer.id}`)
        .then(({ data }) => {
          setOfferStops(data.data || []);
        })
        .catch(() => {
          setOfferStops([]);
          useToastStore.getState().addToast('Failed to load offer stop details', 'error');
        })
        .finally(() => {
          setIsLoadingStops(false);
        });
    } else {
      setOfferStops([]);
    }
  }, [selectedOffer]);

  const loadOrganizations = async () => {
    try {
      const { data } = await api.get('/settings/organizations'); // Custom or mock list of other orgs in the area
      setOrganizations(data || []);
    } catch {
      // Keep mock org list in dev mode if settings endpoint is missing
      setOrganizations([
        { settings_id: 'e6b8c8d8-7b7b-4b4b-9b9b-c8c8c8c8c8c8', company_name: 'SnowBusters Buffalo' },
        { settings_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', company_name: 'Erie Clearing Services' },
      ]);
    }
  };

  const loadActiveOffers = async () => {
    setIsLoadingOffers(true);
    try {
      const { data } = await api.get('/subcontracts/active');
      setActiveOffers(data.data || []);
    } catch {
      useToastStore.getState().addToast('Failed to sync active subcontract offers', 'error');
    } finally {
      setIsLoadingOffers(false);
    }
  };

  const handleToggleStop = (stopId: string) => {
    setSelectedStopIds(prev => 
      prev.includes(stopId) ? prev.filter(id => id !== stopId) : [...prev, stopId]
    );
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStopIds.length === 0 || !payoutRate || isNaN(Number(payoutRate))) {
      useToastStore.getState().addToast('Please select stops and specify a valid payout rate.', 'warning');
      return;
    }

    setIsBroadcasting(true);
    try {
      await api.post('/subcontracts/broadcast', {
        route_stop_ids: selectedStopIds,
        offered_payout: Number(payoutRate),
        target_org_id: targetOrgId || null,
      });

      useToastStore.getState().addToast(`Successfully broadcasted ${selectedStopIds.length} stops to B2B network!`, 'success');
      setSelectedRouteId('');
      setPayoutRate('');
      setSelectedStopIds([]);
      setTargetOrgId('');
      loadActiveOffers();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to broadcast subcontract offer';
      useToastStore.getState().addToast(msg, 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleAcceptOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer || !acceptRouteId || !acceptDriverId) {
      useToastStore.getState().addToast('Please pick a crew driver and a target route sequence.', 'warning');
      return;
    }

    setIsAccepting(true);
    try {
      await api.post(`/subcontracts/${selectedOffer.id}/accept`, {
        driver_id: acceptDriverId,
        route_id: acceptRouteId,
      });

      useToastStore.getState().addToast(`Offer accepted! stops duplicated into your crew's route queue. Escrow funded.`, 'success');
      setSelectedOffer(null);
      setAcceptRouteId('');
      setAcceptDriverId('');
      loadActiveOffers();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message ?? 'Failed to accept subcontract offer';
      useToastStore.getState().addToast(msg, 'error');
    } finally {
      setIsAccepting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}></div>

      {/* Main Glass Panel Card */}
      <div className="relative glass-panel rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-scale-up gradient-border">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/40 flex items-center justify-between shrink-0 bg-slate-900/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <Briefcase className="w-6 h-6 text-gradient" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">B2B Subcontracting Exchange</h3>
              <p className="text-xs text-slate-400 font-medium">Outsource overflow routes or capture competitor surplus payout contracts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-850 hover:bg-slate-800 border border-slate-700/30 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer btn-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 py-2 border-b border-slate-850 shrink-0 flex gap-2 bg-slate-950/20">
          <button
            onClick={() => { setActiveTab('broadcast'); setSelectedOffer(null); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'broadcast'
                ? 'bg-slate-800 text-white border border-slate-700/50 shadow-md'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            <Send className="w-4 h-4" />
            Broadcast Stop Offer
          </button>
          <button
            onClick={() => { setActiveTab('marketplace'); loadActiveOffers(); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'marketplace'
                ? 'bg-slate-800 text-white border border-slate-700/50 shadow-md'
                : 'text-slate-500 hover:text-slate-350'
            }`}
          >
            <Globe className="w-4 h-4" />
            Subcontract Marketplace
            {activeOffers.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-brand-500 text-[10px] text-white font-extrabold animate-pulse">
                {activeOffers.length}
              </span>
            )}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-[#070b13]">
          
          {/* TAB 1: BROADCAST NEW JOB */}
          {activeTab === 'broadcast' && (
            <form onSubmit={handleBroadcastSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              {/* Form Controls */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    1. Select Source Route
                  </label>
                  <CustomSelect
                    options={[
                      { value: '', label: '-- Choose Route containing stops to subcontract --' },
                      ...routes.filter(r => r.status !== 'completed').map(r => ({
                        value: r.route_id,
                        label: `${r.route_name} (${r.stop_count} stops, status: ${r.status})`
                      }))
                    ]}
                    value={selectedRouteId}
                    onChange={(val) => setSelectedRouteId(val)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    2. Escrow Payout Rate ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <input
                      type="number"
                      placeholder="e.g. 150.00 (Total amount released upon driver proof of service)"
                      value={payoutRate}
                      onChange={(e) => setPayoutRate(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-brand-500/40"
                      required
                      min="1"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    3. Target Competitor Organization (Optional)
                  </label>
                  <CustomSelect
                    options={[
                      { value: '', label: 'Public Broadcast (All verified local subcontractors can accept)' },
                      ...organizations.map(org => ({
                        value: org.settings_id,
                        label: `Private Deal: ${org.company_name}`
                      }))
                    ]}
                    value={targetOrgId}
                    onChange={(val) => setTargetOrgId(val)}
                  />
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                    Public deals are searchable on the B2B exchange. Private deals are only visible to the specified enterprise rival.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isBroadcasting || selectedStopIds.length === 0}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/10 transition-all btn-press cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isBroadcasting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        Funding Stripe Escrow...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Lock Escrow & Broadcast Offer
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stop Selector Panel */}
              <div className="flex flex-col border border-slate-800/40 rounded-2xl overflow-hidden bg-slate-950/20">
                <div className="p-3.5 border-b border-slate-850/80 bg-slate-900/10 flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-bold text-slate-350 uppercase tracking-widest flex items-center gap-1.5">
                    <List className="w-4 h-4 text-brand-400" /> Choose stops to delegate ({selectedStopIds.length} picked)
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2 max-h-[350px]">
                  {!selectedRouteId ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                      <List className="w-8 h-8 text-slate-700 animate-pulse" />
                      <p className="text-xs font-semibold">Select a source route first to list available clearing points.</p>
                    </div>
                  ) : routeStops.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-550 italic font-semibold">
                      No active pending or in-progress stops available on this route.
                    </div>
                  ) : (
                    routeStops.map(stop => {
                      const isChecked = selectedStopIds.includes(stop.stop_id);
                      return (
                        <div
                          key={stop.stop_id}
                          onClick={() => handleToggleStop(stop.stop_id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                            isChecked
                              ? 'bg-brand-500/10 border-brand-500/30'
                              : 'bg-slate-900/20 border-slate-800/40 hover:bg-slate-900/40'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="w-4 h-4 text-brand-600 border-slate-800 rounded bg-slate-950 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-200 truncate">{stop.name}</div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">{stop.address}</div>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                            stop.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {stop.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: SUBCONTRACT MARKETPLACE */}
          {activeTab === 'marketplace' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              {/* Active Broadcasts list */}
              <div className="flex flex-col border border-slate-800/40 rounded-2xl overflow-hidden bg-slate-950/20">
                <div className="p-3.5 border-b border-slate-850/80 bg-slate-900/10 shrink-0">
                  <span className="text-[11px] font-bold text-slate-350 uppercase tracking-widest">
                    Available competitor contracts
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 max-h-[380px]">
                  {isLoadingOffers ? (
                    <div className="h-full flex items-center justify-center p-8 text-slate-500 font-semibold gap-2">
                      <span className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></span>
                      Scanning B2B network...
                    </div>
                  ) : activeOffers.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-2">
                      <Globe className="w-8 h-8 text-slate-700" />
                      <p className="text-xs font-semibold">No active competitor subcontracts broadcasted in your area.</p>
                    </div>
                  ) : (
                    activeOffers.map(offer => {
                      const isSelected = selectedOffer?.id === offer.id;
                      return (
                        <div
                          key={offer.id}
                          onClick={() => setSelectedOffer(offer)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                            isSelected
                              ? 'bg-slate-800/80 border-brand-500/40 shadow-glow-brand'
                              : 'bg-slate-900/20 border-slate-800/40 hover:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-white group-hover:text-brand-400 transition-colors">
                              {offer.origin_company_name}
                            </span>
                            <span className="text-sm font-black text-emerald-400 font-mono">
                              ${Number(offer.offered_payout).toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-semibold mt-3">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-brand-400" /> {offer.stop_count} clearing stops
                            </span>
                            <span>•</span>
                            <span>Posted {new Date(offer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          {offer.target_org_id && (
                            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/15 text-[9px] font-extrabold text-indigo-400 uppercase">
                              Private Deal
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Offer Acceptance Details */}
              <div className="flex flex-col border border-slate-800/40 rounded-2xl overflow-hidden bg-slate-950/20">
                <div className="p-3.5 border-b border-slate-850/80 bg-slate-900/10 shrink-0 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-350 uppercase tracking-widest">
                    Contract specification details
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {!selectedOffer ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-550 space-y-2">
                      <Eye className="w-8 h-8 text-slate-700 animate-pulse" />
                      <p className="text-xs font-semibold">Select an available offer on the left to review contract terms and geofences.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Offer Info */}
                      <div className="p-3.5 bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-1">
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Originating Enterprise Rival</div>
                        <div className="text-sm font-extrabold text-slate-200">{selectedOffer.origin_company_name}</div>
                        <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] font-semibold text-slate-400">
                          <div>Payout: <strong className="text-emerald-400 font-mono">${Number(selectedOffer.offered_payout).toFixed(2)}</strong></div>
                          <div>Escrow status: <strong className="text-emerald-400 font-bold">Escrow Active</strong></div>
                        </div>
                      </div>

                      {/* Stops Details list */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Service Coordinates roster</div>
                        <div className="divide-y divide-slate-850 max-h-32 overflow-y-auto pr-1">
                          {isLoadingStops ? (
                            <div className="text-slate-500 text-xs py-2 italic font-semibold">Loading stop data...</div>
                          ) : (
                            offerStops.map((stop, idx) => (
                              <div key={stop.id} className="py-2 flex items-center justify-between text-xs font-semibold">
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="text-slate-200 truncate">{stop.customer_name}</div>
                                  <div className="text-[9px] text-slate-500 truncate">{stop.customer_address}</div>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 shrink-0 font-semibold bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                                  stop {idx + 1}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Accept Offer Action Form */}
                      <form onSubmit={handleAcceptOfferSubmit} className="pt-2 border-t border-slate-850/80 space-y-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Swallow into Fleet Routes</div>
                        
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Target Crew Driver</label>
                            <CustomSelect
                              options={[
                                { value: '', label: '-- Choose --' },
                                ...drivers.filter(d => d.status === 'active').map(d => ({
                                  value: d.driver_id,
                                  label: d.name
                                }))
                              ]}
                              value={acceptDriverId}
                              onChange={(val) => setAcceptDriverId(val)}
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Target active Route</label>
                            <CustomSelect
                              options={[
                                { value: '', label: '-- Choose --' },
                                ...routes.filter(r => r.status !== 'completed' && (!acceptDriverId || r.driver_id === acceptDriverId)).map(r => ({
                                  value: r.route_id,
                                  label: r.route_name
                                }))
                              ]}
                              value={acceptRouteId}
                              onChange={(val) => setAcceptRouteId(val)}
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isAccepting || !acceptDriverId || !acceptRouteId}
                          className="w-full py-2.5 bg-gradient-to-r from-brand-500 to-indigo-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md btn-press cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isAccepting ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                              Accepting & Appending Route...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 animate-pulse" />
                              Accept Contract & Lock Escrow
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
