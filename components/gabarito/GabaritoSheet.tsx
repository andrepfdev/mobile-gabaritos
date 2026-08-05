import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../../theme/tokens';
import { Exam } from '../../lib/localDb/schema';
import { ARUCO_CORNER_IDS } from '../../lib/gabarito/arucoPatterns';
import { buildGabaritoLayout, optionsForCount } from '../../lib/gabarito/layout';
import { ArucoMarker } from './ArucoMarker';

export type GabaritoSheetProps = {
  exam: Exam;
  width?: number;
  /** 0-indexed question -> correct option letter. When set, that bubble renders pre-filled (calibration sheet). */
  answerKey?: Record<number, string>;
};

export function GabaritoSheet({ exam, width = 1000, answerKey }: GabaritoSheetProps) {
  const layout = buildGabaritoLayout(exam.questionCount, optionsForCount(exam.optionsCount));
  const height = width / layout.aspectRatio;
  const bubbleDiameter = layout.bubbleRadiusPct * width * 2;
  const labelFontSize = bubbleDiameter * 0.5;
  const headerH = layout.headerHeightPct * height;
  const optionLabelSize = Math.max(9, bubbleDiameter * 0.28);
  const columnHeaderFontSize = bubbleDiameter * 0.4;

  return (
    <View style={[styles.sheet, { width, height }]}>
      {/* Identity only — kept above the OMR frame so ArUco never overlaps title/QR. */}
      <View style={[styles.header, { height: headerH, paddingHorizontal: width * 0.05 }]}>
        <View style={styles.headerText}>
          <RNText
            style={[styles.text, { fontSize: width * 0.026, fontWeight: '700', color: colors.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {exam.title}
          </RNText>
          <RNText
            style={[styles.text, { fontSize: width * 0.018, marginTop: 4, color: colors.textMuted }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {[exam.subject, exam.className].filter(Boolean).join(' · ') || ' '}
          </RNText>
          <RNText style={[styles.text, { fontSize: width * 0.02, marginTop: 6, fontWeight: '700', color: colors.coral }]}>
            {`Código: ${exam.code}`}
          </RNText>
        </View>
        <View style={styles.qrWrap}>
          <QRCode value={exam.id} size={width * 0.09} color={colors.printInk} backgroundColor={colors.white} />
        </View>
      </View>
      <View style={[styles.headerDivider, { top: headerH, width }]} />

      {/* Big column letters above the grid — print-only, well outside any bubble's sampled
          area, so making these bigger/bolder never affects OMR reading (unlike the small
          letter inside each bubble, which is deliberately kept faint — see below). */}
      {layout.columnHeaders.map((label) => {
        const boxSize = columnHeaderFontSize * 1.4;
        return (
          <View
            key={`col-${label.column}-${label.option}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: label.center.xPct * width - boxSize / 2,
              top: label.center.yPct * height - boxSize / 2,
              width: boxSize,
              height: boxSize,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RNText
              style={[
                styles.text,
                {
                  fontSize: columnHeaderFontSize,
                  fontWeight: '700',
                  color: colors.printInk,
                  // Shrunk vs. the bubble diameter and nudged up within its box, so there's
                  // clear air between the letter and the bubble row below it.
                  transform: [{ translateY: -columnHeaderFontSize * 0.35 }],
                },
              ]}
            >
              {label.option}
            </RNText>
          </View>
        );
      })}

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
                color: colors.printInk,
                transform: [{ translateX: -labelFontSize / 2 }, { translateY: -labelFontSize / 2 }],
              },
            ]}
          >
            {`${row.question}`}
          </RNText>
          {row.options.map((bubble) => {
            const cx = bubble.center.xPct * width;
            const cy = bubble.center.yPct * height;
            const isMarked = answerKey?.[row.question - 1] === bubble.option;
            return (
              <React.Fragment key={bubble.option}>
                <View
                  style={[
                    styles.bubble,
                    isMarked && styles.bubbleMarked,
                    {
                      width: bubbleDiameter,
                      height: bubbleDiameter,
                      borderRadius: bubbleDiameter / 2,
                      left: cx - bubbleDiameter / 2,
                      top: cy - bubbleDiameter / 2,
                    },
                  ]}
                />
                {/* Letter centered inside the disk (clean printable template). */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: cx - bubbleDiameter / 2,
                    top: cy - bubbleDiameter / 2,
                    width: bubbleDiameter,
                    height: bubbleDiameter,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RNText
                    style={[
                      styles.text,
                      {
                        fontSize: optionLabelSize,
                        fontWeight: '600',
                        // Soft gray: readable on print, weaker than pen for OMR. White when
                        // pre-filled (calibration sheet) so the letter stays legible on ink.
                        color: isMarked ? colors.white : colors.textMuted,
                        // Android font metrics bias glyphs upward inside the disk.
                        transform: [{ translateY: optionLabelSize * 0.12 }],
                      },
                    ]}
                  >
                    {bubble.option}
                  </RNText>
                </View>
              </React.Fragment>
            );
          })}
        </React.Fragment>
      ))}

      {/* ArUco frames the OMR block only (below header). */}
      {(['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const).map((corner) => {
        const point = layout.corners[corner];
        const size = layout.cornerMarkSizePct * width;
        return (
          <ArucoMarker
            key={corner}
            id={ARUCO_CORNER_IDS[corner]}
            size={size}
            left={point.xPct * width - size / 2}
            top={point.yPct * height - size / 2}
          />
        );
      })}
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
    overflow: 'hidden',
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
    justifyContent: 'center',
  },
  qrWrap: {
    flexShrink: 0,
  },
  headerDivider: {
    position: 'absolute',
    left: 0,
    height: 2,
    backgroundColor: colors.printInk,
  },
  label: {
    position: 'absolute',
  },
  text: {
    includeFontPadding: false,
  },
  bubble: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: colors.printInk,
    backgroundColor: colors.white,
  },
  bubbleMarked: {
    backgroundColor: colors.printInk,
  },
});
