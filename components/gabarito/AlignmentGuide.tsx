import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '../../theme/tokens';
import { GabaritoLayout } from '../../lib/gabarito/layout';

export type AlignmentGuideProps = {
  layout: GabaritoLayout;
};

/**
 * Visual guide overlaid on the camera preview so the teacher can manually align the printed
 * sheet's corner markers within it before capturing — this is a manual substitute for automatic
 * perspective correction (which this app doesn't implement).
 */
export function AlignmentGuide({ layout }: AlignmentGuideProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const maxWidth = screenWidth * 0.86;
  const maxHeight = screenHeight * 0.68;

  let guideWidth = maxWidth;
  let guideHeight = guideWidth / layout.aspectRatio;
  if (guideHeight > maxHeight) {
    guideHeight = maxHeight;
    guideWidth = guideHeight * layout.aspectRatio;
  }

  const markSize = layout.cornerMarkSizePct * guideWidth;

  return (
    <View pointerEvents="none" style={styles.wrap}>
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
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
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
