import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../theme/tokens';
import { Text } from './Text';

export type GaugeChartProps = {
  percentage: number; // 0-100
  size?: number;
  dotCount?: number;
  activeColor?: string;
  inactiveColor?: string;
  label?: string;
};

export function GaugeChart({
  percentage,
  size = 140,
  dotCount = 40,
  activeColor = colors.dark,
  inactiveColor = colors.progressTrack,
  label,
}: GaugeChartProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;

  const dots = useMemo(() => {
    const activeDots = Math.round((clamped / 100) * dotCount);
    return Array.from({ length: dotCount }, (_, i) => {
      // Semicircle spans from 180deg (left) to 0deg (right), sweeping over the top.
      const theta = Math.PI - (i / (dotCount - 1)) * Math.PI;
      const x = cx + radius * Math.cos(theta);
      const y = cy - radius * Math.sin(theta);
      return { x, y, active: i < activeDots };
    });
  }, [clamped, dotCount, cx, cy, radius]);

  return (
    <View style={[styles.container, { width: size, height: size / 2 + 40 }]}>
      <Svg width={size} height={size / 2 + 12}>
        {dots.map((dot, i) => (
          <Circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={3}
            fill={dot.active ? activeColor : inactiveColor}
          />
        ))}
      </Svg>
      <View style={styles.labelWrap}>
        <Text variant="hero" weight="bold">{`${Math.round(clamped)}%`}</Text>
        {label ? (
          <Text variant="caption" color={colors.textMuted}>
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  labelWrap: {
    position: 'absolute',
    top: '38%',
    alignItems: 'center',
  },
});
