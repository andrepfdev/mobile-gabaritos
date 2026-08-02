import React, { useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';
import { Text } from '../../components/ui/Text';
import { PillButton } from '../../components/ui/PillButton';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const SLIDES: { title: string; subtitle: string; icon: IconName; bg: string }[] = [
  {
    title: 'Bem-vindo ao ProvaZero!',
    subtitle: 'Organize suas provas e acompanhe o desempenho das correções em um só app.',
    icon: 'document-text-outline',
    bg: colors.coralSoft,
  },
  {
    title: 'Corrija provas em minutos',
    subtitle: 'Marque as respostas dos alunos e compare com o gabarito oficial na hora, direto do celular.',
    icon: 'checkmark-done-outline',
    bg: colors.yellowSoft,
  },
  {
    title: 'Estatísticas por aluno e turma',
    subtitle: 'Acompanhe taxa de acerto, tempo de correção e evolução de cada turma.',
    icon: 'stats-chart-outline',
    bg: colors.coralSoft,
  },
  {
    title: 'Histórico completo de provas',
    subtitle: 'Todas as suas provas corrigidas ficam salvas e organizadas no dispositivo.',
    icon: 'time-outline',
    bg: colors.yellowSoft,
  },
];

function SlideIllustration({ icon, bg }: { icon: IconName; bg: string }) {
  const size = 220;
  return (
    <View style={styles.illustrationWrap}>
      <Svg width={size} height={size} viewBox="0 0 220 220">
        <Circle cx={110} cy={110} r={110} fill={bg} />
        <Circle cx={110} cy={110} r={78} fill={colors.white} />
      </Svg>
      <View style={styles.illustrationIcon}>
        <Ionicons name={icon} size={64} color={colors.coral} />
      </View>
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
            <SlideIllustration icon={slide.icon} bg={slide.bg} />
            <Text variant="h1" weight="bold" color={colors.textPrimary} style={styles.title}>
              {slide.title}
            </Text>
            <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
              {slide.subtitle}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View key={slide.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <PillButton title={isLast ? 'Começar' : 'Próximo'} variant="accent" onPress={goNext} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
  },
  scroll: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  illustrationIcon: {
    position: 'absolute',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
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
