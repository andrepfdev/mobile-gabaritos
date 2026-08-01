import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { colors, spacing } from '../../theme/tokens';
import { Text } from './Text';

export type BarChartDatum = { label: string; value: number };

export type BarChartProps = {
  data: BarChartDatum[];
  maxValue?: number;
  height?: number;
  barColor?: string;
};

export function BarChart({ data, maxValue, height = 120, barColor = colors.dark }: BarChartProps) {
  const width = Math.max(240, data.length * 40);
  const axisMax = useMemo(() => {
    if (maxValue) return maxValue;
    const dataMax = Math.max(...data.map((d) => d.value), 0);
    return Math.max(5, Math.ceil(dataMax / 5) * 5);
  }, [data, maxValue]);

  const ticks = [0, axisMax / 2, axisMax];
  const chartHeight = height;
  const barWidth = 10;
  const gap = (width - data.length * barWidth) / (data.length + 1);
  const axisLabelWidth = 24;

  return (
    <View style={styles.container}>
      <Svg width={width + axisLabelWidth} height={chartHeight + 24}>
        {ticks.map((tick) => {
          const y = chartHeight - (tick / axisMax) * chartHeight;
          return (
            <React.Fragment key={tick}>
              <Line
                x1={axisLabelWidth}
                x2={width + axisLabelWidth}
                y1={y}
                y2={y}
                stroke={colors.progressTrack}
                strokeWidth={1}
              />
              <SvgText
                x={axisLabelWidth - 6}
                y={y + 4}
                fontSize={10}
                fill={colors.textMuted}
                textAnchor="end"
              >
                {tick}
              </SvgText>
            </React.Fragment>
          );
        })}
        {data.map((d, i) => {
          const barHeight = Math.max(2, (d.value / axisMax) * chartHeight);
          const x = axisLabelWidth + gap + i * (barWidth + gap);
          const y = chartHeight - barHeight;
          return (
            <Rect
              key={d.label}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={barWidth / 2}
              fill={barColor}
            />
          );
        })}
      </Svg>
      <View style={[styles.labelsRow, { paddingLeft: axisLabelWidth }]}>
        {data.map((d) => (
          <Text key={d.label} variant="caption" color={colors.textMuted} style={styles.label}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  label: {
    width: 34,
    textAlign: 'center',
  },
});
