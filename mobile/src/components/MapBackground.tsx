import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Polyline, Circle, Path } from 'react-native-svg';
import type { GpsSample } from '../services/gps.service';
import type { RouteStop } from '../services/route.service';

interface MapBackgroundProps {
  currentLocation: GpsSample | null;
  stops: RouteStop[];
  currentStop: RouteStop | null;
  routeGeometry: [number, number][]; // [lon, lat]
  isDark: boolean;
}

const TILE_SIZE = 256;
const ZOOM = 15;

function lonToTileX(lon: number, z: number): number {
  return ((lon + 180) / 360) * Math.pow(2, z);
}

function latToTileY(lat: number, z: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, z)
  );
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export default function MapBackground({
  currentLocation,
  stops,
  currentStop,
  routeGeometry,
  isDark,
}: MapBackgroundProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Animation values for smooth panning
  const animatedTranslateX = useRef(new Animated.Value(0)).current;
  const animatedTranslateY = useRef(new Animated.Value(0)).current;
  
  const lastLocationRef = useRef<GpsSample | null>(null);
  const currentBearingRef = useRef(0);

  // If dimensions are not yet layout-measured, fallback to window dimensions
  const viewportWidth = dimensions.width || 400;
  const viewportHeight = dimensions.height || 600;

  // 1. Calculate active reference position (default to first stop if no GPS)
  const defaultLat = currentStop ? currentStop.lat : (stops[0]?.lat ?? 43.6532);
  const defaultLon = currentStop ? currentStop.lon : (stops[0]?.lon ?? -79.3832);

  const activeLat = currentLocation ? currentLocation.lat : defaultLat;
  const activeLon = currentLocation ? currentLocation.lon : defaultLon;

  // Calculate bearing for driver rotation
  if (currentLocation) {
    if (currentLocation.heading_deg !== undefined) {
      currentBearingRef.current = currentLocation.heading_deg;
    } else if (lastLocationRef.current) {
      const dist = Math.hypot(
        currentLocation.lat - lastLocationRef.current.lat,
        currentLocation.lon - lastLocationRef.current.lon
      );
      // Only recalculate bearing if they moved a minimum threshold to avoid jitter
      if (dist > 0.00005) {
        currentBearingRef.current = calculateBearing(
          lastLocationRef.current.lat,
          lastLocationRef.current.lon,
          currentLocation.lat,
          currentLocation.lon
        );
      }
    }
    lastLocationRef.current = currentLocation;
  }

  // Calculate base tile indexes for 3x3 grid centered on target coords
  const xGps = lonToTileX(activeLon, ZOOM);
  const yGps = latToTileY(activeLat, ZOOM);

  const xBase = Math.floor(xGps) - 1;
  const yBase = Math.floor(yGps) - 1;

  // Calculate exact pixel position of the active center inside the 3x3 grid
  const px = (xGps - xBase) * TILE_SIZE;
  const py = (yGps - yBase) * TILE_SIZE;

  // The grid needs to shift so the active location is at (viewportWidth / 2, viewportHeight / 2)
  const targetTranslateX = viewportWidth / 2 - px;
  const targetTranslateY = viewportHeight / 2 - py;

  useEffect(() => {
    // Smoothly animate the map translation when coordinates change
    Animated.parallel([
      Animated.timing(animatedTranslateX, {
        toValue: targetTranslateX,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(animatedTranslateY, {
        toValue: targetTranslateY,
        duration: 800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [targetTranslateX, targetTranslateY, animatedTranslateX, animatedTranslateY]);

  // Generate tile list for 3x3 grid
  const tileRows = [0, 1, 2];
  const tileCols = [0, 1, 2];

  // Tile Server URL matching the selected theme (Dark Mode uses CartoDB Dark Matter)
  const tileUrl = (x: number, y: number) => {
    if (isDark) {
      return `https://a.basemaps.cartocdn.com/dark_all/${ZOOM}/${x}/${y}.png`;
    }
    return `https://a.basemaps.cartocdn.com/rastertiles/voyager_labels_under/${ZOOM}/${x}/${y}.png`;
  };

  // Convert coordinate points to local SVG/Grid pixel space
  const getPixelXY = (lat: number, lon: number) => {
    const x = (lonToTileX(lon, ZOOM) - xBase) * TILE_SIZE;
    const y = (latToTileY(lat, ZOOM) - yBase) * TILE_SIZE;
    return { x, y };
  };

  // Build the route polyline string for <Polyline>
  const polylinePoints = routeGeometry
    .map(([lon, lat]) => {
      const { x, y } = getPixelXY(lat, lon);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
      ]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setDimensions({ width, height });
      }}
    >
      <Animated.View
        style={[
          styles.mapGrid,
          {
            width: TILE_SIZE * 3,
            height: TILE_SIZE * 3,
            transform: [
              { translateX: animatedTranslateX },
              { translateY: animatedTranslateY },
            ],
          },
        ]}
      >
        {/* Render 3x3 Tile Grid */}
        <View style={styles.tileGridContainer}>
          {tileRows.map((row) => (
            <View key={`row-${row}`} style={styles.tileRow}>
              {tileCols.map((col) => {
                const tx = xBase + col;
                const ty = yBase + row;
                return (
                  <Image
                    key={`tile-${tx}-${ty}`}
                    source={{ uri: tileUrl(tx, ty) }}
                    style={styles.tileImage}
                    fadeDuration={0}
                  />
                );
              })}
            </View>
          ))}
        </View>

        {/* SVG Drawing Layer: Route Polyline, Stop Pins, and Customer Labels */}
        <Svg
          style={StyleSheet.absoluteFill}
          width={TILE_SIZE * 3}
          height={TILE_SIZE * 3}
        >
          {/* Route Polyline (Glow + Main Line) */}
          {routeGeometry.length > 0 && (
            <>
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke={isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(46, 117, 182, 0.25)'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Polyline
                points={polylinePoints}
                fill="none"
                stroke={isDark ? '#38BDF8' : '#2E75B6'}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Stop Markers */}
          {stops.map((stop) => {
            const { x, y } = getPixelXY(stop.lat, stop.lon);
            
            // Choose marker color based on status
            let color = '#38BDF8'; // pending default
            if (stop.status === 'in_progress') color = '#F97316'; // orange
            if (stop.status === 'completed') color = '#10B981'; // green
            if (stop.status === 'skipped') color = '#EF4444'; // red

            const isTarget = currentStop && currentStop.stop_id === stop.stop_id;

            return (
              <React.Fragment key={stop.stop_id}>
                {/* Target Stop Pulsing Ring */}
                {isTarget && (
                  <Circle
                    cx={x}
                    cy={y}
                    r="14"
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    opacity="0.5"
                  />
                )}

                {/* Main Stop Circle */}
                <Circle
                  cx={x}
                  cy={y}
                  r={isTarget ? '9' : '7'}
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                />
              </React.Fragment>
            );
          })}
        </Svg>
      </Animated.View>

      {/* Driver Location Indicator Overlay (Kept exactly at center of viewport) */}
      {dimensions.width > 0 && (
        <View
          style={[
            styles.driverMarkerContainer,
            {
              left: viewportWidth / 2 - 24,
              top: viewportHeight / 2 - 24,
              transform: [{ rotate: `${currentBearingRef.current}deg` }],
            },
          ]}
          pointerEvents="none"
        >
          {/* High-visibility Navigation Chevron Arrow */}
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
            {/* Pulsing glow ring around driver */}
            <Circle cx="12" cy="12" r="10" fill="rgba(56, 189, 248, 0.15)" stroke="rgba(56, 189, 248, 0.3)" strokeWidth="1" />
            <Path
              d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"
              fill="#38BDF8"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  mapGrid: {
    position: 'absolute',
  },
  tileGridContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  tileRow: {
    flexDirection: 'row',
    height: TILE_SIZE,
  },
  tileImage: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  driverMarkerContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
