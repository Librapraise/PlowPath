import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock react-leaflet and leaflet entirely
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children, position }: any) => (
    <div data-testid="map-marker" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="map-popup">{children}</div>,
  Polyline: ({ positions }: any) => (
    <div data-testid="map-polyline" data-positions={JSON.stringify(positions)} />
  ),
  useMap: () => ({
    setView: vi.fn(),
    panTo: vi.fn(),
    fitBounds: vi.fn(),
    getZoom: vi.fn(() => 12),
  }),
}));

vi.mock('leaflet', () => {
  return {
    default: {
      divIcon: vi.fn(() => ({})),
      latLngBounds: vi.fn(() => ({
        extend: vi.fn(),
      })),
    },
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({
      extend: vi.fn(),
    })),
  };
});

// Mock react-router-dom navigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => vi.fn(),
    Navigate: ({ to }: any) => <div data-testid="navigate" data-to={to} />,
    Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  };
});
