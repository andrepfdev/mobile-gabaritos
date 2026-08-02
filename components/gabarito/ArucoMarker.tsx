import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { arucoGridWithBorder } from '../../lib/gabarito/arucoPatterns';
import { colors } from '../../theme/tokens';

type ArucoMarkerProps = {
  id: number;
  size: number;
  left: number;
  top: number;
};

/** Renders an OpenCV-compatible DICT_4X4 ArUco marker as a grid of Views (print-safe, no fonts). */
export function ArucoMarker({ id, size, left, top }: ArucoMarkerProps) {
  const grid = useMemo(() => arucoGridWithBorder(id), [id]);
  const module = size / grid.length;

  return (
    <View style={[styles.wrap, { width: size, height: size, left, top }]}>
      {grid.map((row, r) =>
        row.map((bit, c) => (
          <View
            key={`${r}-${c}`}
            style={{
              position: 'absolute',
              left: c * module,
              top: r * module,
              width: module + 0.5,
              height: module + 0.5,
              backgroundColor: bit ? colors.white : colors.dark,
            }}
          />
        )),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
});
