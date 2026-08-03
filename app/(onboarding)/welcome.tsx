import React, { useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';
import { Text } from '../../components/ui/Text';
import { PillButton } from '../../components/ui/PillButton';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

type Icon = { kind: 'gabarito' } | { kind: 'ionicon'; name: React.ComponentProps<typeof Ionicons>['name'] };

const SLIDES: { title: string; highlight?: string; subtitle: string; icon: Icon; bg: string }[] = [
  {
    title: 'Esqueça as horas corrigindo provas!',
    highlight: 'ProvaZero',
    subtitle: 'O ProvaZero ajuda você a criar, aplicar e corrigir avaliações em instantes. Mais tempo para o que realmente importa.',
    icon: { kind: 'gabarito' },
    bg: colors.coralSoft,
  },
  {
    title: 'Sinta a facilidade no seu dia a dia',
    subtitle: 'Crie gabaritos e avaliações em poucos cliques. Simplifique sua rotina pedagógica com o ProvaZero.',
    icon: { kind: 'ionicon', name: 'checkmark-done-outline' },
    bg: colors.yellowSoft,
  },
];

function SlideTitle({ title, highlight }: { title: string; highlight?: string }) {
  const index = highlight ? title.indexOf(highlight) : -1;
  if (!highlight || index === -1) {
    return (
      <Text variant="h1" weight="bold" color={colors.textPrimary} style={styles.title}>
        {title}
      </Text>
    );
  }

  const before = title.slice(0, index);
  const after = title.slice(index + highlight.length);

  return (
    <Text variant="h1" weight="bold" color={colors.textPrimary} style={styles.title}>
      {before}
      <Text variant="h1" weight="bold" color={colors.coral}>
        {highlight}
      </Text>
      {after}
    </Text>
  );
}

/** Line-art answer sheet: numbered rows, lettered bubbles (A–E), one filled per row. */
function GabaritoIcon({ color, size = 132 }: { color: string; size?: number }) {
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const rowY = [42, 76, 110, 144, 178];
  const filledIndex = [1, 3, 2, 0, 4];
  const colX = [61, 88, 115, 142, 169];
  const bubbleR = 11;

  return (
    <Svg width={size} height={size * 1.1} viewBox="0 0 200 220">
      <Rect x="12" y="12" width="176" height="196" rx="20" stroke={color} strokeWidth={5} fill="#ffffff" />
      {rowY.map((y, row) => (
        <React.Fragment key={y}>
          <SvgText x={30} y={y + 7} fontSize={20} fontWeight="700" fill={color} textAnchor="middle">
            {row + 1}
          </SvgText>
          {colX.map((x, col) => {
            const filled = col === filledIndex[row];
            return (
              <React.Fragment key={x}>
                <Circle
                  cx={x}
                  cy={y}
                  r={bubbleR}
                  stroke={color}
                  strokeWidth={2.5}
                  fill={filled ? color : '#ffffff'}
                />
                <SvgText
                  x={x}
                  y={y + 4}
                  fontSize={12}
                  fontWeight="700"
                  fill={filled ? '#ffffff' : color}
                  textAnchor="middle"
                >
                  {letters[col]}
                </SvgText>
              </React.Fragment>
            );
          })}
        </React.Fragment>
      ))}
    </Svg>
  );
}

function SlideIllustration({ icon, bg }: { icon: Icon; bg: string }) {
  return (
    <View style={[styles.panel, { backgroundColor: bg }]}>
      {icon.kind === 'gabarito' ? (
        <GabaritoIcon color={colors.coral} />
      ) : (
        <Ionicons name={icon.name} size={108} color={colors.coral} />
      )}
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
          <View key={slide.title} style={{ width }}>
            <SlideIllustration icon={slide.icon} bg={slide.bg} />
            <View style={styles.textArea}>
              <SlideTitle title={slide.title} highlight={slide.highlight} />
              <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
                {slide.subtitle}
              </Text>
            </View>
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
  panel: {
    height: '55%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
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
