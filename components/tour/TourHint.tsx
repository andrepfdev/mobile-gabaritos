import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui/Text';
import { colors, radii, spacing } from '../../theme/tokens';

export type TourHintProps = {
  text: string;
  onDismiss: () => void;
};

/** One-time coachmark overlaid on top of a real screen element (card/button) to guide the
 *  teacher through printing and scanning the calibration gabarito — see store/authStore.ts's
 *  `calibrationTourStep`. The parent must be `position: 'relative'` and wrap the target element;
 *  this component fills it and never intercepts taps on the target itself (`pointerEvents`). */
export function TourHint({ text, onDismiss }: TourHintProps) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.ring} pointerEvents="none" />

      <View style={styles.callout} pointerEvents="none">
        <View style={styles.badge}>
          <Text variant="caption" weight="bold" color={colors.textPrimary}>
            Calibre o celular
          </Text>
        </View>
        <View style={styles.bubble}>
          <Text variant="caption" weight="medium" color={colors.textOnDark} style={styles.bubbleText}>
            {text}
          </Text>
        </View>
        <Ionicons name="caret-down" size={18} color={colors.dark} style={styles.tail} />
      </View>

      <View style={styles.centerWrap} pointerEvents="none">
        <LottieView source={require('../../assets/animations/strong-pencil.json')} autoPlay loop style={styles.animation} />
      </View>

      <View style={styles.skipRow}>
        <Pressable onPress={onDismiss} hitSlop={8} style={styles.skip}>
          <Text variant="body" weight="medium" color={colors.textOnDark}>
            Pular
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  ring: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.coral,
  },
  callout: {
    position: 'absolute',
    top: -90,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.yellow,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    marginBottom: spacing.xs,
  },
  bubble: {
    backgroundColor: colors.dark,
    borderRadius: radii.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    maxWidth: '90%',
  },
  bubbleText: {
    textAlign: 'center',
  },
  tail: {
    marginTop: -2,
  },
  centerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animation: {
    width: 220,
    height: 220,
  },
  skipRow: {
    position: 'absolute',
    bottom: -spacing.xl - spacing.sm,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  skip: {
    backgroundColor: colors.dark,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
