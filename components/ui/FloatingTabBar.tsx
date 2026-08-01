import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, radii, shadow, spacing } from '../../theme/tokens';

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

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + spacing.sm }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {items.map((item) => (
          <TabBarButton
            key={item.key}
            item={item}
            active={pathname.startsWith(item.route)}
            onPress={() => router.push(item.route as never)}
          />
        ))}
      </View>
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
      { translateY: withSpring(active ? -14 : 0, { damping: 14, stiffness: 180 }) },
      { scale: withSpring(active ? 1 : 0.9, { damping: 14, stiffness: 180 }) },
    ],
  }));

  return (
    <Pressable onPress={onPress} style={styles.item} hitSlop={8}>
      <Animated.View style={[styles.iconWrap, active && styles.iconWrapActive, animatedIconWrapStyle]}>
        <Ionicons name={item.icon} size={20} color={colors.white} />
      </Animated.View>
      <View style={[styles.dot, active && styles.dotActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.dark,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...shadow.card,
  },
  item: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.coral,
    borderWidth: 3,
    borderColor: colors.white,
    ...shadow.card,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: colors.coral,
  },
});
