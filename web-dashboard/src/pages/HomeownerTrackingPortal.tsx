import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Flame, CheckCircle, Clock, MapPin, Navigation, HelpCircle, Thermometer, Wind } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons
const plowIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-lg animate-bounce text-white">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V18a2.25 2.25 0 0 1 2.25-2.25h1.5a.75.75 0 0 0 .75-.75V11.25a.75.75 0 0 0-.75-.75h-.75a.75.75 0 0 1-.75-.75V6.375c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v3.375a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 0-.75.75V15a.75.75 0 0 0 .75.75h1.5a2.25 2.25 0 0 1 2.25 2.25v.375a1.125 1.125 0 0 1-1.125 1.125H13.5m0 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const homeIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="flex items-center justify-center w-10 h-10 bg-emerald-600 rounded-full border-4 border-white shadow-lg text-white">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface HomeownerData {
  customer_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  driver_latitude: number | null;
  driver_longitude: number | null;
  driver_name: string | null;
  driver_phone: string | null;
  eta_minutes: number | null;
  proof_photo_url: string | null;
  notes: string | null;
  last_updated: string;
}

export default function HomeownerTrackingPortal() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HomeownerData | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Load initial status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        // In real app: GET /api/v1/tracking/portal/:slug
        // We will mock this response elegantly to make it fully functional and gorgeous
        await new Promise((resolve) => setTimeout(resolve, 800));
        
        const mockData: HomeownerData = {
          customer_id: 'cust-homeowner-9',
          name: 'Sarah Jenkins',
          address: '4223 Oakwood Lane, Grand Rapids, MI',
          latitude: 42.9634,
          longitude: -85.6681,
          status: 'in_progress',
          driver_latitude: 42.9685,
          driver_longitude: -85.6790,
          driver_name: 'David Miller',
          driver_phone: '+15551110001',
          eta_minutes: 12,
          proof_photo_url: null,
          notes: null,
          last_updated: new Date().toISOString(),
        };

        setData(mockData);
        setLoading(false);
      } catch (err) {
        setError('Unable to load tracking details. Please verify your link.');
        setLoading(false);
      }
    };

    fetchStatus();
  }, [slug]);

  // Wire Socket connections for live progress
  useEffect(() => {
    if (!data) return;

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Homeowner tracker connected to real-time sync.');
    });

    // Handle telemetry streams
    newSocket.on('driver:telemetry', (payload: any) => {
      setData((prev) => {
        if (!prev) return null;
        // Simple mock distance math to update status stages
        const latDiff = Math.abs(payload.latitude - prev.latitude);
        const lonDiff = Math.abs(payload.longitude - prev.longitude);
        const distanceDegrees = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
        const distanceMeters = distanceDegrees * 111000;

        let newStatus = prev.status;
        let eta = prev.eta_minutes;

        if (distanceMeters < 25) {
          newStatus = 'completed';
          eta = 0;
        } else if (distanceMeters < 250) {
          newStatus = 'in_progress';
          eta = 1;
        } else {
          eta = Math.round(distanceMeters / 300); // 300 meters per minute speed estimation
        }

        return {
          ...prev,
          driver_latitude: payload.latitude,
          driver_longitude: payload.longitude,
          eta_minutes: eta,
          status: newStatus as any,
          last_updated: new Date().toISOString(),
        };
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [data?.customer_id]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-200">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-blue-500"></div>
        <p className="mt-4 text-sm font-medium tracking-wide text-slate-400">Loading live tracking details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-200">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-950/50 border border-red-500/20 text-red-500">
          <HelpCircle className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-white">Tracking Link Expired</h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          {error ?? 'This track link is expired or invalid. Track links are deactivated 12 hours after route completion.'}
        </p>
      </div>
    );
  }

  // Stepper calculations
  const steps = [
    { label: 'Scheduled', desc: 'Snow crew is assigned', completed: true, active: false },
    { label: 'En Route', desc: 'Driver is headed your way', completed: data.status === 'in_progress' || data.status === 'completed', active: data.status === 'in_progress' && (data.eta_minutes ?? 10) > 2 },
    { label: 'Plow Nearby', desc: 'Vehicle within 250m geofence', completed: data.status === 'completed' || (data.status === 'in_progress' && (data.eta_minutes ?? 10) <= 2), active: data.status === 'in_progress' && (data.eta_minutes ?? 10) <= 2 },
    { label: 'Plowed', desc: 'Completed with photo log', completed: data.status === 'completed', active: data.status === 'completed' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 lg:flex-row">
      {/* Detail Sidebar */}
      <div className="flex w-full flex-col p-6 lg:w-[420px] lg:border-r lg:border-slate-800/80 bg-slate-950/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-white">PlowPath Live</h1>
            <p className="text-xs text-slate-500 font-medium">SMS Secure Track: {slug}</p>
          </div>
        </div>

        {/* ETA Panel */}
        <div className="mt-6 rounded-2xl bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-slate-900 border border-blue-500/20 p-5 shadow-inner">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider uppercase text-blue-400">Estimated Arrival</p>
              <h2 className="mt-1 text-3xl font-black text-white">
                {data.status === 'completed' ? (
                  <span className="text-emerald-400 flex items-center gap-2">
                    <CheckCircle className="h-8 w-8" /> Plowed!
                  </span>
                ) : data.eta_minutes !== null ? (
                  `${data.eta_minutes} mins`
                ) : (
                  'Pending'
                )}
              </h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-950 text-blue-400">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-slate-800/50 pt-4 text-xs text-slate-400">
            <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="truncate">{data.address}</span>
          </div>
        </div>

        {/* Weather Conditions */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 border border-slate-800 p-3">
            <Thermometer className="h-5 w-5 text-blue-400" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Temp</p>
              <p className="text-sm font-bold text-slate-200">24°F</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-slate-900 border border-slate-800 p-3">
            <Wind className="h-5 w-5 text-sky-400" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Accumulation</p>
              <p className="text-sm font-bold text-slate-200">1.2 in/hr</p>
            </div>
          </div>
        </div>

        {/* Stepper Progress */}
        <div className="mt-6 flex-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Service Status</h3>
          <div className="relative border-l border-slate-800 ml-3 pl-6 space-y-6">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                <span className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  step.completed 
                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                    : step.active
                      ? 'bg-blue-600 border-blue-600 text-white animate-ping'
                      : 'bg-slate-950 border-slate-800 text-slate-600'
                }`}>
                  {step.completed && (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor" className="w-2 h-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </span>
                
                {/* Visual ping overlap for active step */}
                {step.active && (
                  <span className="absolute -left-[31px] top-0.5 h-4 w-4 rounded-full bg-blue-500 animate-ping opacity-75"></span>
                )}

                <div>
                  <h4 className={`text-sm font-bold ${step.completed || step.active ? 'text-white' : 'text-slate-500'}`}>
                    {step.label}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Driver HUD */}
        {data.driver_name && data.status !== 'completed' && (
          <div className="mt-6 border-t border-slate-800 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Your Driver</h3>
            <div className="flex items-center justify-between rounded-xl bg-slate-900 border border-slate-800 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-200 font-bold border border-slate-700">
                  {data.driver_name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{data.driver_name}</h4>
                  <p className="text-xs text-slate-500">Active Crew member</p>
                </div>
              </div>
              <a
                href={`tel:${data.driver_phone}`}
                className="flex h-9 items-center justify-center rounded-lg bg-slate-800 px-4 border border-slate-700 text-xs font-bold hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Call
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Live Map Panel */}
      <div className="relative h-[300px] w-full grow lg:h-screen lg:w-auto">
        <MapContainer
          center={[data.latitude, data.longitude]}
          zoom={14}
          scrollWheelZoom={true}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Homeowner Property */}
          <Marker position={[data.latitude, data.longitude]} icon={homeIcon}>
            <Popup>
              <div className="p-1">
                <p className="font-bold text-slate-900">{data.name}</p>
                <p className="text-xs text-slate-500">{data.address}</p>
              </div>
            </Popup>
          </Marker>

          {/* Live Plow Driver Location */}
          {data.driver_latitude && data.driver_longitude && data.status !== 'completed' && (
            <>
              <Marker position={[data.driver_latitude, data.driver_longitude]} icon={plowIcon}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-slate-900">Plow Crew Location</p>
                    <p className="text-xs text-slate-500">Currently headed to your property</p>
                  </div>
                </Popup>
              </Marker>

              {/* Bounding radius overlays to show geofence warnings */}
              <Circle
                center={[data.latitude, data.longitude]}
                radius={250}
                pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, dashArray: '5, 10' }}
              />
              <Circle
                center={[data.latitude, data.longitude]}
                radius={25}
                pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.15 }}
              />
            </>
          )}
        </MapContainer>

        {/* Live compass navigation warning overlay */}
        {data.status !== 'completed' && data.driver_latitude && (
          <div className="absolute bottom-5 right-5 z-[500] flex items-center gap-2 rounded-xl bg-slate-950/80 border border-slate-800 p-3 text-xs font-bold text-slate-200 backdrop-blur-md shadow-2xl">
            <Navigation className="h-4 w-4 animate-spin text-blue-500" />
            <span>Plow active. Map updating live.</span>
          </div>
        )}
      </div>
    </div>
  );
}
