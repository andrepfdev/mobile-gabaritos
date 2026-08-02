import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '../../theme/tokens';
import { GabaritoLayout } from '../../lib/gabarito/layout';

export type AlignmentGuideProps = {
  layout: GabaritoLayout;
  /** Center inside the parent flex slot (between tip card and capture button). */
  fillParent?: boolean;
};

/**
 * Visual guide overlaid on the camera preview so the teacher aligns the printed ArUco corner
 * markers before capturing. Perspective correction runs after capture (warp → ROI sampling).
 */
export function AlignmentGuide({ layout, fillParent = false }: AlignmentGuideProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const maxWidth = screenWidth * 0.82;
  // When embedded between chrome, keep the frame fully visible and easy to aim.
  const maxHeight = fillParent ? screenHeight * 0.5 : screenHeight * 0.55;

  let guideWidth = maxWidth;
  let guideHeight = guideWidth / layout.aspectRatio;
  if (guideHeight > maxHeight) {
    guideHeight = maxHeight;
    guideWidth = guideHeight * layout.aspectRatio;
  }

  const markSize = layout.cornerMarkSizePct * guideWidth;

  return (
    <View pointerEvents="none" style={fillParent ? styles.slotWrap : styles.screenWrap}>
      <View style={[styles.guide, { width: guideWidth, height: guideHeight }]}>
        {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((corner) => {
          const point = layout.corners[corner];
          return (
            <View
              key={corner}
              style={[
                styles.mark,
                {
                  width: markSize,
                  height: markSize,
                  left: point.xPct * guideWidth - markSize / 2,
                  top: point.yPct * guideHeight - markSize / 2,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
  },
  guide: {
    borderWidth: 2,
    borderColor: colors.white,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  mark: {
    position: 'absolute',
    backgroundColor: colors.coral,
    borderRadius: 3,
  },
});
