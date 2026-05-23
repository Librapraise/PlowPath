import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';

interface Props {
  total: number;
  currentIndex: number;
  width?: number;
  height?: number;
}

/**
 * Simple SVG dots/line showing route progress. No map tiles —
 * the mobile app is text-first per the v3 PRD.
 */
export default function RouteProgress({ total, currentIndex, width = 320, height = 40 }: Props) {
  if (total <= 0) return null;

  const padding = 12;
  const usable = width - padding * 2;
  const step = total === 1 ? 0 : usable / (total - 1);

  return (
    <View accessibilityLabel={`Progress: stop ${currentIndex + 1} of ${total}`}>
      <Svg width={width} height={height}>
        <Line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2}
              stroke="#ccc" strokeWidth={4} />
        {Array.from({ length: total }, (_, i) => {
          const x = padding + step * i;
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <Circle
              key={i}
              cx={x}
              cy={height / 2}
              r={active ? 10 : 7}
              fill={done ? '#28A745' : active ? '#2E75B6' : '#fff'}
              stroke={done ? '#28A745' : active ? '#2E75B6' : '#999'}
              strokeWidth={2}
            />
          );
        })}
      </Svg>
    </View>
  );
}
