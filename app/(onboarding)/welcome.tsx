import React, { useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme/tokens';
import { Text } from '../../components/ui/Text';
import { PillButton } from '../../components/ui/PillButton';
import { Card } from '../../components/ui/Card';
import { StatusTag } from '../../components/ui/StatusTag';
import { GaugeChart } from '../../components/ui/GaugeChart';
import { BarChart } from '../../components/ui/BarChart';
import { weekdayCorrections } from '../../lib/mockData';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Bem-vindo ao ProvaZero!',
    subtitle: 'Organize suas provas e acompanhe o desempenho das correções em um só app.',
  },
  {
    title: 'Corrija provas em minutos',
    subtitle: 'Marque as respostas dos alunos e compare com o gabarito oficial na hora, direto do celular.',
  },
  {
    title: 'Estatísticas por aluno e turma',
    subtitle: 'Acompanhe taxa de acerto, tempo de correção e evolução de cada turma.',
  },
  {
    title: 'Histórico completo de provas',
    subtitle: 'Todas as suas provas corrigidas ficam salvas e organizadas no dispositivo.',
  },
];

function CardFan() {
  return (
    <View style={styles.fan}>
      <Card variant="light" style={[styles.fanCard, styles.fanCardLeft]}>
        <StatusTag label="60% corrigidas" bg={colors.grayLight} />
        <Text variant="hero" weight="bold" style={{ marginTop: spacing.sm }}>
          5
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          Provas hoje
        </Text>
      </Card>
      <Card variant="dark" style={[styles.fanCard, styles.fanCardCenter]}>
        <GaugeChart percentage={94} size={100} label="Acerto médio" />
      </Card>
      <Card variant="light" style={[styles.fanCard, styles.fanCardRight]}>
        <Text variant="caption" weight="medium" color={colors.textMuted}>
          Correções da semana
        </Text>
        <BarChart data={weekdayCorrections} height={70} />
      </Card>
    </View>
  );
}

export default function Welcome() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const markOnboardingSeen = useAuthStore((s) => s.markOnboardingSeen);

  const isLast = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(newIndex);
  };

  const goNext = async () => {
    if (isLast) {
      await markOnboardingSeen();
      router.replace('/(auth)/login');
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <CardFan />
      </SafeAreaView>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.scroll}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Text variant="h1" weight="bold" color={colors.textPrimary} style={styles.title}>
              {slide.title}
            </Text>
            <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
              {slide.subtitle}
            </Text>
          </View>
        ))}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View key={slide.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <PillButton title={isLast ? 'Começar' : 'Próximo'} variant="accent" onPress={goNext} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
  },
  safeArea: {
    paddingTop: spacing.xl,
  },
  fan: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanCard: {
    position: 'absolute',
    width: 150,
  },
  fanCardLeft: {
    transform: [{ rotate: '-8deg' }, { translateX: -90 }],
  },
  fanCardCenter: {
    transform: [{ rotate: '0deg' }],
    zIndex: 2,
  },
  fanCardRight: {
    transform: [{ rotate: '8deg' }, { translateX: 90 }],
  },
  scroll: {
    flex: 1,
  },
  slide: {
    paddingHorizontal: spacing.lg,
    justifyContent: 'flex-start',
    paddingTop: spacing.lg,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {},
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.progressTrack,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.dark,
    width: 20,
  },
});
