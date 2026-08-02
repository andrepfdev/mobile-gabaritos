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
};

export function GabaritoSheet({ exam, width = 1000 }: GabaritoSheetProps) {
  const layout = buildGabaritoLayout(exam.questionCount, optionsForCount(exam.optionsCount));
  const height = width / layout.aspectRatio;
  const bubbleDiameter = layout.bubbleRadiusPct * width * 2;
  const labelFontSize = bubbleDiameter * 0.5;
  const headerH = layout.headerHeightPct * height;
  const optionLabelSize = Math.max(9, bubbleDiameter * 0.28);

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
            return (
              <React.Fragment key={bubble.option}>
                {/* Letter ABOVE the disk so ink sampling never hits the glyph (G03). */}
                <RNText
                  style={[
                    styles.text,
                    {
                      position: 'absolute',
                      left: cx,
                      top: cy - bubbleDiameter * 0.62,
                      width: bubbleDiameter,
                      marginLeft: -bubbleDiameter / 2,
                      textAlign: 'center',
                      fontSize: optionLabelSize,
                      fontWeight: '600',
                      color: colors.printInk,
                    },
                  ]}
                >
                  {bubble.option}
                </RNText>
                <View
                  style={[
                    styles.bubble,
                    {
                      width: bubbleDiameter,
                      height: bubbleDiameter,
                      borderRadius: bubbleDiameter / 2,
                      left: cx - bubbleDiameter / 2,
                      top: cy - bubbleDiameter / 2,
                    },
                  ]}
                />
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
    borderWidth: 1.5,
    borderColor: colors.printInk,
    backgroundColor: colors.white,
  },
});
