import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Text } from './Text';
import { colors, radii, spacing } from '../../theme/tokens';

export type TabItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

export type FloatingTabBarProps = {
  items: TabItem[];
};

export function FloatingTabBar({ items }: FloatingTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  // Android's 3-button nav bar is a fixed 48dp (AOSP `navigation_bar_height`), but under
  // edge-to-edge on some device/library combos `insets.bottom` under-reports it — flooring at
  // 48 on Android keeps this bar's dark background reaching the real screen edge instead of
  // leaving a gap where the light app background shows through behind the nav buttons.
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 48) : insets.bottom;

  return (
    <View style={[styles.bar, { paddingBottom: bottomInset + spacing.xs }]}>
      {items.map((item) => (
        <TabBarButton
          key={item.key}
          item={item}
          active={pathname.startsWith(item.route)}
          onPress={() => router.push(item.route as never)}
        />
      ))}
    </View>
  );
}

type TabBarButtonProps = {
  item: TabItem;
  active: boolean;
  onPress: () => void;
};

function TabBarButton({ item, active, onPress }: TabBarButtonProps) {
  const animatedIconWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withSpring(active ? -8 : 0, { damping: 14, stiffness: 180 }) },
      { scale: withSpring(active ? 1 : 0.9, { damping: 14, stiffness: 180 }) },
    ],
  }));

  return (
    <Pressable onPress={onPress} style={styles.item} hitSlop={8}>
      <Animated.View style={[styles.iconWrap, active && styles.iconWrapActive, animatedIconWrapStyle]}>
        <Ionicons name={item.icon} size={24} color={colors.white} />
      </Animated.View>
      <Text
        variant="caption"
        weight={active ? 'bold' : 'regular'}
        color={active ? colors.coral : '#c9c9c9'}
        style={styles.label}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: colors.dark,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.coral,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  label: {
    marginTop: 4,
  },
});
