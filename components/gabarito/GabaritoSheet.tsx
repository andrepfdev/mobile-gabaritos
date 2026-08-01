import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
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
  const labelFontSize = bubbleDiameter * 0.5;

  return (
    <View style={[styles.sheet, { width, height }]}>
      {/* minHeight (not height) + top alignment: a long title can wrap to 2 lines and grow the
          header without overlapping the divider/first row — the divider itself is a separate
          absolutely-positioned line pinned at the reserved header height, not this View's border. */}
      <View
        style={[
          styles.header,
          { minHeight: layout.headerHeightPct * height, paddingHorizontal: width * 0.06 },
        ]}
      >
        <View style={styles.headerText}>
          {/* Plain system font (no custom Fredoka family) for every text element on the printed
              sheet — the brand's playful rounded font isn't legible at small sizes (B/R and E/F
              become ambiguous) and, in testing, also rendered with visible artifacts through
              react-native-view-shot. A plain sans-serif is what real bubble sheets use anyway. */}
          <RNText style={[styles.text, { fontSize: width * 0.026, fontWeight: '700', color: colors.textPrimary }]} numberOfLines={2}>
            {exam.title}
          </RNText>
          <RNText style={[styles.text, { fontSize: width * 0.018, marginTop: 4, color: colors.textMuted }]}>
            {[exam.subject, exam.className].filter(Boolean).join(' · ') || ' '}
          </RNText>
          <RNText style={[styles.text, { fontSize: width * 0.02, marginTop: 6, fontWeight: '700', color: colors.coral }]}>
            {`Código: ${exam.code}`}
          </RNText>
        </View>
        <QRCode value={exam.id} size={width * 0.085} color={colors.dark} backgroundColor={colors.white} />
      </View>
      <View style={[styles.headerDivider, { top: layout.headerHeightPct * height, width }]} />

      {layout.rows.map((row) =>
        row.question % 2 === 0 ? (
          <View
            key={`band-${row.question}`}
            style={[
              styles.band,
              {
                left: row.band.xPct * width,
                top: row.band.yPct * height,
                width: row.band.widthPct * width,
                height: row.band.heightPct * height,
              },
            ]}
          />
        ) : null,
      )}

      {layout.rows.map((row) => (
        <React.Fragment key={row.question}>
          <RNText
            style={[
              styles.label,
              styles.text,
              {
                left: row.labelCenter.xPct * width,
                top: row.labelCenter.yPct * height,
                fontSize: labelFontSize,
                fontWeight: '600',
                color: colors.textPrimary,
                transform: [{ translateX: -labelFontSize / 2 }, { translateY: -labelFontSize / 2 }],
              },
            ]}
          >
            {`${row.question}`}
          </RNText>
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
              <RNText style={[styles.text, { fontSize: bubbleDiameter * 0.42, fontWeight: '600', color: colors.textMuted }]}>
                {bubble.option}
              </RNText>
            </View>
          ))}
        </React.Fragment>
      ))}

      {/* Rendered last (on top of the row stripes) — the bottom corner marks sit close enough to
          the last row that an even-numbered final row's stripe could otherwise paint over part of
          them, leaving a clipped-looking mark that throws off corner detection when scanning. */}
      <CornerMark layout={layout} width={width} height={height} corner="topLeft" />
      <CornerMark layout={layout} width={width} height={height} corner="topRight" />
      <CornerMark layout={layout} width={width} height={height} corner="bottomLeft" />
      <CornerMark layout={layout} width={width} height={height} corner="bottomRight" />
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  headerText: {
    flexShrink: 1,
    paddingRight: 12,
  },
  headerDivider: {
    position: 'absolute',
    left: 0,
    height: 2,
    backgroundColor: colors.dark,
  },
  cornerMark: {
    position: 'absolute',
    backgroundColor: colors.dark,
  },
  band: {
    position: 'absolute',
    backgroundColor: colors.grayLight,
    borderRadius: 6,
  },
  label: {
    position: 'absolute',
  },
  text: {
    includeFontPadding: false,
  },
  bubble: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
