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
  const n = grid.length;
  // Floor module size — no +0.5 overlap that bleeds modules together on print.
  const module = size / n;

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
              width: module,
              height: module,
              backgroundColor: bit ? colors.white : colors.printInk,
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
