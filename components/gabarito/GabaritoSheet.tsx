import React from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Text } from '../ui/Text';
import { colors } from '../../theme/tokens';
import { Exam } from '../../lib/localDb/schema';
import { buildGabaritoLayout, GabaritoLayout } from '../../lib/gabarito/layout';

export type GabaritoSheetProps = {
  exam: Exam;
  width?: number;
};

function CornerMark({ layout, width, height, corner }: { layout: GabaritoLayout; width: number; height: number; corner: keyof GabaritoLayout['corners'] }) {
  const point = layout.corners[corner];
  const size = layout.cornerMarkSizePct * width;
  return (
    <View
      style={[
        styles.cornerMark,
        {
          width: size,
          height: size,
          left: point.xPct * width - size / 2,
          top: point.yPct * height - size / 2,
        },
      ]}
    />
  );
}

export function GabaritoSheet({ exam, width = 1000 }: GabaritoSheetProps) {
  const layout = buildGabaritoLayout(exam.questionCount);
  const height = width / layout.aspectRatio;
  const bubbleDiameter = layout.bubbleRadiusPct * width * 2;

  return (
    <View style={[styles.sheet, { width, height }]}>
      <CornerMark layout={layout} width={width} height={height} corner="topLeft" />
      <CornerMark layout={layout} width={width} height={height} corner="topRight" />
      <CornerMark layout={layout} width={width} height={height} corner="bottomLeft" />
      <CornerMark layout={layout} width={width} height={height} corner="bottomRight" />

      <View style={[styles.header, { height: layout.headerHeightPct * height, paddingHorizontal: width * 0.06 }]}>
        <View style={styles.headerText}>
          <Text style={{ fontSize: width * 0.032 }} weight="bold">
            {exam.title}
          </Text>
          <Text style={{ fontSize: width * 0.02, marginTop: 4 }} color={colors.textMuted}>
            {[exam.subject, exam.className].filter(Boolean).join(' · ') || ' '}
          </Text>
          <Text style={{ fontSize: width * 0.024, marginTop: 8 }} weight="bold" color={colors.coral}>
            {`Código: ${exam.code}`}
          </Text>
        </View>
        <QRCode value={exam.id} size={layout.headerHeightPct * height * 0.7} color={colors.dark} backgroundColor={colors.white} />
      </View>

      {layout.rows.map((row) => (
        <React.Fragment key={row.question}>
          <Text
            style={[
              styles.label,
              {
                left: row.labelCenter.xPct * width,
                top: row.labelCenter.yPct * height,
                fontSize: width * 0.018,
              },
            ]}
            weight="medium"
          >
            {`${row.question}`}
          </Text>
          {row.options.map((bubble) => (
            <View
              key={bubble.option}
              style={[
                styles.bubble,
                {
                  width: bubbleDiameter,
                  height: bubbleDiameter,
                  borderRadius: bubbleDiameter / 2,
                  left: bubble.center.xPct * width - bubbleDiameter / 2,
                  top: bubble.center.yPct * height - bubbleDiameter / 2,
                },
              ]}
            >
              <Text style={{ fontSize: bubbleDiameter * 0.45 }} weight="medium" color={colors.textMuted}>
                {bubble.option}
              </Text>
            </View>
          ))}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.white,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: colors.dark,
  },
  headerText: {
    flexShrink: 1,
  },
  cornerMark: {
    position: 'absolute',
    backgroundColor: colors.dark,
  },
  label: {
    position: 'absolute',
    transform: [{ translateX: -10 }, { translateY: -10 }],
  },
  bubble: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
