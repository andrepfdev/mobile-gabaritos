import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { colors, spacing } from '../../theme/tokens';
import { Text } from './Text';

export type LineChartPoint = { label: string; value: number };

export type LineChartProps = {
  data: LineChartPoint[];
  height?: number;
  lineColor?: string;
  highlightIndex?: number;
};

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2;
    d += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export function LineChart({ data, height = 160, lineColor = colors.coral, highlightIndex }: LineChartProps) {
  const width = 320;
  const paddingY = 24;

  const { path, points, maxIndex } = useMemo(() => {
    if (data.length === 0) return { path: '', points: [] as { x: number; y: number }[], maxIndex: 0 };
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = width / Math.max(data.length - 1, 1);

    const pts = data.map((d, i) => ({
      x: i * stepX,
      y: paddingY + (1 - (d.value - min) / range) * (height - paddingY * 2),
    }));

    const highest = values.indexOf(max);
    return { path: buildSmoothPath(pts), points: pts, maxIndex: highlightIndex ?? highest };
  }, [data, height, highlightIndex]);

  if (data.length === 0) return null;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line x1={0} y1={paddingY} x2={width} y2={paddingY} stroke={colors.progressTrack} strokeWidth={1} />
        <Line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={colors.progressTrack} strokeWidth={1} />
        <Line
          x1={0}
          y1={height - paddingY}
          x2={width}
          y2={height - paddingY}
          stroke={colors.progressTrack}
          strokeWidth={1}
        />
        <Path d={path} stroke={lineColor} strokeWidth={3} fill="none" strokeLinecap="round" />
        {points.map((p, i) =>
          i === maxIndex ? (
            <Circle key={i} cx={p.x} cy={p.y} r={6} fill={colors.dark} stroke={colors.white} strokeWidth={2} />
          ) : null
        )}
      </Svg>
      <View style={styles.labelsRow}>
        {data.map((d, i) => (
          <Text key={i} variant="caption" color={colors.textMuted} style={styles.label}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  label: {
    flex: 1,
    textAlign: 'center',
  },
});
