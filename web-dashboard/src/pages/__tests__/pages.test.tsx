import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LoginPage from '../LoginPage';
import LiveOpsPage from '../LiveOpsPage';
import CustomersPage from '../CustomersPage';
import DriversPage from '../DriversPage';
import StormsPage from '../StormsPage';
import RoutesPage from '../RoutesPage';
import { useAuthStore } from '../../store/authStore';
import { useDriversStore } from '../../store/driversStore';
import { useCustomersStore } from '../../store/customersStore';
import { useStormsStore } from '../../store/stormsStore';
import { useRoutesStore } from '../../store/routesStore';

// Mock API calls
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn((url) => {
      if (url === '/drivers') {
        return Promise.resolve({
          data: {
            data: [
              {
                driver_id: 'd1',
                user_id: 'u1',
                name: 'Jane Doe',
                phone: '555-0199',
                hourly_rate: 45,
                vehicle_type: 'F-350 Plow',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          },
        });
      }
      if (url === '/routes') {
        return Promise.resolve({
          data: {
            data: [
              {
                route_id: 'r1',
                storm_id: 's1',
                driver_id: 'd1',
                route_name: 'Buffalo North Commercial Run',
                status: 'in_progress',
                start_time: new Date().toISOString(),
                end_time: null,
                total_distance: 12.4,
                stop_count: 1,
                stops: [
                  {
                    stop_id: 'rs1',
                    sequence_number: 1,
                    status: 'in_progress',
                    arrival_time: null,
                    completion_time: null,
                    notes: null,
                    customer_id: 'c1',
                    name: 'Target Store #45',
                    address: '123 Main St, Buffalo NY',
                    access_notes: 'Gate code 4432',
                    phone: '555-9000',
                    lat: 42.8864,
                    lon: -78.8784,
                  },
                ],
              },
            ],
          },
        });
      }
      if (url === '/storms') {
        return Promise.resolve({
          data: {
            data: [
              {
                storm_id: 's1',
                name: 'Late-Season Blizzard 2026',
                start_time: new Date().toISOString(),
                end_time: null,
                forecasted_accumulation: 14.5,
                actual_accumulation: null,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          },
        });
      }
      if (url === '/customers') {
        return Promise.resolve({
          data: {
            data: [
              {
                customer_id: 'c1',
                name: 'Target Store #45',
                address: '123 Main St, Buffalo NY',
                phone: '555-9000',
                email: 'buffalo.target@target.com',
                access_notes: 'Gate code 4432',
                status: 'active',
                property_type: 'commercial',
                driveway_type: 'asphalt',
                lat: 42.8864,
                lon: -78.8784,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            page: 1,
            per_page: 10,
            total: 1,
          },
        });
      }
      if (url.startsWith('/tracking/driver/')) {
        return Promise.resolve({
          data: {
            data: [
              {
                driver_id: 'd1',
                lat: 42.8864,
                lon: -78.8784,
                recorded_at: new Date().toISOString(),
              },
            ],
          },
        });
      }
      if (url === '/tracking/latest') {
        return Promise.resolve({
          data: {
            data: [
              {
                driver_id: 'd1',
                lat: 42.8864,
                lon: -78.8784,
                recorded_at: new Date().toISOString(),
                speed_mps: 5,
                heading_deg: 90,
                accuracy_m: 5,
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

describe('PlowPath Dashboard Smoke Tests', () => {
  // Pre-seed stores before tests
  beforeEach(() => {
    useAuthStore.setState({
      user: { user_id: 'u-owner', name: 'John Dispatcher', role: 'owner', email: 'john@plowpath.com', phone: '123', driver_id: null },
      token: 'fake-token',
      refreshToken: 'fake-refresh-token',
    });

    useDriversStore.setState({
      drivers: [
        {
          driver_id: 'd1',
          user_id: 'u1',
          name: 'Jane Doe',
          phone: '555-0199',
          hourly_rate: 45,
          vehicle_type: 'F-350 Plow',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    });

    useCustomersStore.setState({
      customers: [
        {
          customer_id: 'c1',
          name: 'Target Store #45',
          address: '123 Main St, Buffalo NY',
          phone: '555-9000',
          email: 'buffalo.target@target.com',
          access_notes: 'Gate code 4432',
          status: 'active',
          property_type: 'commercial',
          driveway_type: 'asphalt',
          lat: 42.8864,
          lon: -78.8784,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
      page: 1,
      total: 1,
    });

    useStormsStore.setState({
      storms: [
        {
          storm_id: 's1',
          name: 'Late-Season Blizzard 2026',
          start_time: new Date().toISOString(),
          end_time: null,
          forecasted_accumulation: 14.5,
          actual_accumulation: null,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
    });

    useRoutesStore.setState({
      routes: [
        {
          route_id: 'r1',
          storm_id: 's1',
          driver_id: 'd1',
          route_name: 'Buffalo North Commercial Run',
          status: 'in_progress',
          start_time: new Date().toISOString(),
          end_time: null,
          total_distance: 12.4,
          stop_count: 1,
          stops: [
            {
              stop_id: 'rs1',
              sequence_number: 1,
              status: 'in_progress',
              arrival_time: null,
              completion_time: null,
              notes: null,
              customer_id: 'c1',
              name: 'Target Store #45',
              address: '123 Main St, Buffalo NY',
              access_notes: 'Gate code 4432',
              phone: '555-9000',
              lat: 42.8864,
              lon: -78.8784,
            },
          ],
        },
      ],
      currentRoute: null,
      isLoading: false,
    });
  });

  it('renders LoginPage successfully', () => {
    render(<LoginPage />);
    expect(screen.getByText('PlowPath')).toBeInTheDocument();
    expect(screen.getByText('Operations Control Console')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('dispatcher@plowpath.com')).toBeInTheDocument();
  });

  it('renders LiveOpsPage successfully', async () => {
    render(<LiveOpsPage />);
    expect(await screen.findByText('Fleet Operations')).toBeInTheDocument();
    expect(screen.getByText('Buffalo North Commercial Run')).toBeInTheDocument();
    expect(screen.getAllByText('Jane Doe')[0]).toBeInTheDocument();
  });

  it('renders CustomersPage successfully', () => {
    render(<CustomersPage />);
    expect(screen.getByText('Customer Accounts')).toBeInTheDocument();
    expect(screen.getByText('Target Store #45')).toBeInTheDocument();
    expect(screen.getByText('123 Main St, Buffalo NY')).toBeInTheDocument();
  });

  it('renders DriversPage successfully', () => {
    render(<DriversPage />);
    expect(screen.getByText('Active Crew Directory')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('F-350 Plow')).toBeInTheDocument();
  });

  it('renders StormsPage successfully', () => {
    render(<StormsPage />);
    expect(screen.getByText('Storm Operations Control')).toBeInTheDocument();
    expect(screen.getByText('Late-Season Blizzard 2026')).toBeInTheDocument();
    expect(screen.getByText('14.5 in')).toBeInTheDocument();
  });

  it('renders RoutesPage successfully', () => {
    render(<RoutesPage />);
    expect(screen.getByText('Storm Routes')).toBeInTheDocument();
    expect(screen.getByText('Buffalo North Commercial Run')).toBeInTheDocument();
  });
});

