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
 * Visual guide overlaid on the camera — frames the OMR block (ArUco quad), not the header.
 */
export function AlignmentGuide({ layout, fillParent = false }: AlignmentGuideProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const maxWidth = screenWidth * 0.82;
  const maxHeight = fillParent ? screenHeight * 0.5 : screenHeight * 0.55;

  const omrTop = Math.min(layout.corners.topLeft.yPct, layout.corners.topRight.yPct);
  const omrBottom = Math.max(layout.corners.bottomLeft.yPct, layout.corners.bottomRight.yPct);
  const omrLeft = Math.min(layout.corners.topLeft.xPct, layout.corners.bottomLeft.xPct);
  const omrRight = Math.max(layout.corners.topRight.xPct, layout.corners.bottomRight.xPct);
  const omrHeightFrac = Math.max(0.05, omrBottom - omrTop);
  const omrWidthFrac = Math.max(0.05, omrRight - omrLeft);
  // Sheet aspect is width/height; OMR sub-rect aspect = (w*omrW) / (h*omrH) = aspect * omrW / omrH
  const omrAspect = (layout.aspectRatio * omrWidthFrac) / omrHeightFrac;

  let guideWidth = maxWidth;
  let guideHeight = guideWidth / omrAspect;
  if (guideHeight > maxHeight) {
    guideHeight = maxHeight;
    guideWidth = guideHeight * omrAspect;
  }

  const markSize = layout.cornerMarkSizePct * (guideWidth / omrWidthFrac);

  return (
    <View pointerEvents="none" style={fillParent ? styles.slotWrap : styles.screenWrap}>
      <View style={[styles.guide, { width: guideWidth, height: guideHeight }]}>
        {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const).map((corner) => {
          const point = layout.corners[corner];
          const x = ((point.xPct - omrLeft) / omrWidthFrac) * guideWidth;
          const y = ((point.yPct - omrTop) / omrHeightFrac) * guideHeight;
          return (
            <View
              key={corner}
              style={[
                styles.mark,
                {
                  width: markSize,
                  height: markSize,
                  left: x - markSize / 2,
                  top: y - markSize / 2,
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
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
