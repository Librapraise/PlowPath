import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import DriverMarker from './DriverMarker';
import RoutePolyline from './RoutePolyline';
import type { DriverPosition } from '../../pages/LiveOpsPage';
import type { Driver } from '../../store/driversStore';
import type { Route } from '../../store/routesStore';

const DEFAULT_CENTER: [number, number] = [42.8864, -78.8784];
const DEFAULT_ZOOM = 12;
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const getStopIcon = (status: string, seq: number) => {
  let color = '#ef4444'; // pending - red
  if (status === 'in_progress') color = '#f97316'; // in_progress - orange
  if (status === 'completed') color = '#10b981'; // completed - green
  if (status === 'skipped') color = '#64748b'; // skipped - gray

  return L.divIcon({
    className: `plowpath-stop-marker-${status}`,
    html: `
      <div style="
        width: 22px; height: 22px; border-radius: 50%;
        background: ${color}; border: 2.5px solid white;
        box-shadow: 0 1.5px 4px rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: 800; font-size: 9px;
        line-height: 17px; text-align: center;
      ">${seq}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

interface MapControllerProps {
  center: [number, number] | null;
  bounds: L.LatLngBounds | null;
}

function MapController({ center, bounds }: MapControllerProps) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.panTo(center, { animate: true, duration: 0.8 });
    }
  }, [center, map]);

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [bounds, map]);

  return null;
}

interface Props {
  drivers: DriverPosition[];
  driverDetails?: Driver[];
  selectedDriverId?: string | null;
  onSelectDriver?: (driverId: string | null) => void;
  selectedDriverRoute?: Route | null;
  breadcrumbs?: Array<[number, number]> | null;
  showBreadcrumbs?: boolean;
}

export default function LeafletMap({
  drivers,
  driverDetails = [],
  selectedDriverId = null,
  onSelectDriver,
  selectedDriverRoute = null,
  breadcrumbs = null,
  showBreadcrumbs = false,
}: Props) {
  
  const selectedDriverPos = drivers.find((d) => d.driver_id === selectedDriverId);
  const centerPoint: [number, number] | null = selectedDriverPos
    ? [selectedDriverPos.lat, selectedDriverPos.lon]
    : null;

  let polylinePositions: Array<[number, number]> = [];
  let bounds: L.LatLngBounds | null = null;
  
  if (selectedDriverRoute) {
    const geom = selectedDriverRoute.osrm_geometry;
    if (geom && typeof geom === 'object' && geom.coordinates) {
      polylinePositions = geom.coordinates.map((c: any) => [c[1], c[0]]);
    }

    const points: L.LatLngExpression[] = [];
    if (polylinePositions.length > 0) {
      polylinePositions.forEach((p) => points.push(p));
    }
    if (selectedDriverRoute.stops) {
      selectedDriverRoute.stops.forEach((s) => points.push([s.lat, s.lon]));
    }
    if (centerPoint) {
      points.push(centerPoint);
    }

    if (points.length > 0) {
      bounds = L.latLngBounds(points);
    }
  }

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer url={OSM_TILE_URL} attribution={OSM_ATTRIBUTION} />
      
      {polylinePositions.length > 0 && (
        <RoutePolyline positions={polylinePositions} color="#38b0f8" />
      )}

      {showBreadcrumbs && breadcrumbs && breadcrumbs.length > 0 && (
        <Polyline
          positions={breadcrumbs}
          pathOptions={{
            color: '#c084fc',
            weight: 3.5,
            opacity: 0.7,
            dashArray: '5, 8',
          }}
        />
      )}

      {selectedDriverRoute?.stops?.map((stop) => (
        <Marker
          key={stop.stop_id}
          position={[stop.lat, stop.lon]}
          icon={getStopIcon(stop.status, stop.sequence_number)}
        >
          <Popup>
            <div className="font-sans text-xs space-y-1">
              <div className="font-bold text-slate-900">
                #{stop.sequence_number} {stop.name}
              </div>
              <div className="text-slate-500">{stop.address}</div>
              <div className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Status: {stop.status}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {drivers.map((d) => {
        const detail = driverDetails.find((dr) => dr.driver_id === d.driver_id);
        const name = detail?.name ?? `Driver ${d.driver_id.slice(0, 4)}`;
        const vehicleType = detail?.vehicle_type ?? 'Truck';
        const isSelected = selectedDriverId === d.driver_id;
        
        return (
          <DriverMarker
            key={d.driver_id}
            driver={d}
            name={name}
            vehicleType={vehicleType}
            isSelected={isSelected}
            onClick={() => {
              if (onSelectDriver) onSelectDriver(d.driver_id);
            }}
          />
        );
      })}

      <MapController center={centerPoint} bounds={bounds} />
    </MapContainer>
  );
}

