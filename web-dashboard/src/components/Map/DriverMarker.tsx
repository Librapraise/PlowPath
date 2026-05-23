import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { DriverPosition } from '../../pages/LiveOpsPage';

interface Props {
  driver: DriverPosition;
  name?: string;
  vehicleType?: string;
  isSelected?: boolean;
  onClick?: () => void;
}

const createDriverIcon = (initials: string, isSelected: boolean) => {
  const bg = isSelected ? '#38b0f8' : '#0f172a';
  const border = isSelected ? '#ffffff' : '#38b0f8';
  const shadow = isSelected ? '0 0 12px rgba(56, 176, 248, 0.8)' : '0 2px 6px rgba(0,0,0,0.5)';
  
  return L.divIcon({
    className: `plowpath-driver-marker-${driverIdInitials(initials)}`,
    html: `
      <div style="
        width: 32px; height: 32px; border-radius: 50%;
        background: ${bg}; border: 2px solid ${border};
        box-shadow: ${shadow};
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: 800; font-size: 11px;
        transition: all 0.2s ease;
      ">${initials}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

function driverIdInitials(name: string) {
  return name.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(0, 4);
}

export default function DriverMarker({ driver, name = 'Driver', vehicleType = 'Plow Truck', isSelected = false, onClick }: Props) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'DR';

  const speedMph = driver.speed_mps != null ? (driver.speed_mps * 2.23694).toFixed(1) : null;

  return (
    <Marker
      position={[driver.lat, driver.lon]}
      icon={createDriverIcon(initials, isSelected)}
      eventHandlers={{
        click: () => {
          if (onClick) onClick();
        },
      }}
    >
      <Popup>
        <div className="font-sans text-xs space-y-1.5 p-1 min-w-[160px]">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
            <span className="font-extrabold text-slate-900 text-sm">{name}</span>
            <span className="px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded text-[9px] font-bold uppercase tracking-wider">
              {vehicleType}
            </span>
          </div>
          <div className="space-y-1 text-slate-600 font-semibold">
            {speedMph !== null && (
              <div className="flex items-center justify-between text-[10px]">
                <span>Current Speed:</span>
                <span className="text-slate-900 font-bold">{speedMph} mph</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[10px]">
              <span>Last Telemetry:</span>
              <span className="text-slate-900 font-bold">
                {new Date(driver.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

