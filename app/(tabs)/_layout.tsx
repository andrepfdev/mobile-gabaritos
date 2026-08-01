import React from 'react';
import { Redirect, Slot, usePathname } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { FloatingTabBar, TabItem } from '../../components/ui/FloatingTabBar';
import { colors } from '../../theme/tokens';
import { useSubscriptionStatus } from '../../hooks/useSubscriptionStatus';

const TAB_ITEMS: TabItem[] = [
  { key: 'home', label: 'Início', icon: 'home', route: '/home' },
  { key: 'exams', label: 'Provas', icon: 'briefcase', route: '/exams' },
  { key: 'statistics', label: 'Estatísticas', icon: 'stats-chart', route: '/statistics' },
  { key: 'profile', label: 'Perfil', icon: 'person', route: '/profile' },
];

export default function TabsLayout() {
  const { isLoading, hasLapsedSubscription } = useSubscriptionStatus();
  const pathname = usePathname();
  // The camera capture screen is full-bleed with its own bottom-anchored footer (the "Capturar"
  // button) — the floating tab bar would float right on top of it and hide it entirely.
  const hideTabBar = pathname.endsWith('/scan');

  // Avoid flashing protected tab content before we know the subscription status.
  if (isLoading) {
    return <View style={styles.container} />;
  }

  // Accounts that had a subscription which is no longer active are fully blocked from every
  // route under (tabs) — see app/subscription-locked.tsx. Users who never subscribed at all
  // still fall through to the freemium flow (see hooks/useCanCreateExam.ts).
  if (hasLapsedSubscription) {
    return <Redirect href="/subscription-locked" />;
  }

  return (
    <View style={styles.container}>
      <Slot />
      {!hideTabBar ? <FloatingTabBar items={TAB_ITEMS} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
  },
});
