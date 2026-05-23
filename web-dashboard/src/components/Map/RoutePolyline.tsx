import { Polyline } from 'react-leaflet';

interface Props {
  /** [lat, lon] pairs in render order. */
  positions: Array<[number, number]>;
  color?: string;
}

export default function RoutePolyline({ positions, color = '#2E75B6' }: Props) {
  return <Polyline positions={positions} pathOptions={{ color, weight: 4, opacity: 0.8 }} />;
}
