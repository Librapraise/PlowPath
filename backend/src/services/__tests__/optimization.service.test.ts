jest.mock('@turf/turf', () => ({
  point: (coords: number[]) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: coords } }),
  distance: (from: any, to: any, options?: any) => {
    const [lon1, lat1] = from.geometry.coordinates;
    const [lon2, lat2] = to.geometry.coordinates;
    // Simple Euclidean distance in miles approximation
    return Math.sqrt((lon1 - lon2) ** 2 + (lat1 - lat2) ** 2) * 69;
  },
}));

import { calculateDistanceMiles, optimizeRoute, totalRouteDistance, type OptStop } from '../optimization.service';

describe('Optimization Service', () => {
  const buffaloStops: OptStop[] = [
    { id: '1', lat: 42.8864, lon: -78.8784 }, // Buffalo City Hall
    { id: '2', lat: 42.8906, lon: -78.8711 }, // Buffalo General Hospital
    { id: '3', lat: 42.9238, lon: -78.8695 }, // Delaware Park
  ];

  describe('calculateDistanceMiles', () => {
    it('should calculate distance between two coordinates correctly', () => {
      const a = buffaloStops[0];
      const b = buffaloStops[1];
      const dist = calculateDistanceMiles(a, b);
      expect(dist).toBeGreaterThan(0.2);
      expect(dist).toBeLessThan(0.6);
    });
  });

  describe('optimizeRoute', () => {
    it('should return empty array if stops are empty', () => {
      expect(optimizeRoute([])).toEqual([]);
    });

    it('should return the same stop if single stop is provided', () => {
      expect(optimizeRoute([buffaloStops[0]])).toEqual([buffaloStops[0]]);
    });

    it('should optimize route without explicit starting point', () => {
      const result = optimizeRoute(buffaloStops);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(buffaloStops[0]); // defaults to first element as start
    });

    it('should optimize route with custom starting point', () => {
      const start = { id: 'depot', lat: 42.8800, lon: -78.8800 };
      const result = optimizeRoute(buffaloStops, start);
      expect(result).toHaveLength(3);
      // Custom start should optimize based on distance from depot
      expect(result).toContain(buffaloStops[0]);
      expect(result).toContain(buffaloStops[1]);
      expect(result).toContain(buffaloStops[2]);
    });
  });

  describe('totalRouteDistance', () => {
    it('should return 0 for empty or single stop routes', () => {
      expect(totalRouteDistance([])).toBe(0);
      expect(totalRouteDistance([buffaloStops[0]])).toBe(0);
    });

    it('should sum up distances correctly', () => {
      const total = totalRouteDistance(buffaloStops);
      const d1 = calculateDistanceMiles(buffaloStops[0], buffaloStops[1]);
      const d2 = calculateDistanceMiles(buffaloStops[1], buffaloStops[2]);
      expect(total).toBeCloseTo(d1 + d2, 5);
    });
  });
});
