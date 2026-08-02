import React, { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Text } from '../../../../components/ui/Text';
import { PillButton } from '../../../../components/ui/PillButton';
import { GabaritoSheet } from '../../../../components/gabarito/GabaritoSheet';
import { colors, spacing } from '../../../../theme/tokens';
import { useExamStore } from '../../../../store/examStore';
import { buildGabaritoLayout, optionsForCount } from '../../../../lib/gabarito/layout';

// Rendered well above screen resolution so the exported image stays sharp when printed at full
// size — the preview below shows it scaled down to fit the screen, but capture() always grabs
// the full CAPTURE_WIDTH-resolution bitmap regardless of that visual scale.
const CAPTURE_WIDTH = 1600;

export default function ExportGabarito() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const exams = useExamStore((s) => s.exams);
  const exam = exams.find((e) => e.id === examId);
  const viewShotRef = useRef<React.ElementRef<typeof ViewShot>>(null);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  if (!exam) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text variant="body" style={styles.content}>
          Prova não encontrada.
        </Text>
      </SafeAreaView>
    );
  }

  // The sheet's height (and aspect ratio) depends on the question count — a short exam gets a
  // shorter sheet instead of a fixed A4 ratio with wasted blank space at the bottom.
  const aspectRatio = buildGabaritoLayout(exam.questionCount, optionsForCount(exam.optionsCount)).aspectRatio;
  const previewWidth = screenWidth - spacing.lg * 2;
  const captureHeight = CAPTURE_WIDTH / aspectRatio;
  const previewScale = previewWidth / CAPTURE_WIDTH;
  const previewHeight = captureHeight * previewScale;

  const capture = async (): Promise<string | null> => {
    const uri = await viewShotRef.current?.capture?.();
    return uri ?? null;
  };

  const onSave = async () => {
    setBusy('save');
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria para salvar a imagem.');
        return;
      }
      const uri = await capture();
      if (!uri) return;
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Salvo', 'A imagem do gabarito foi salva na sua galeria.');
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    setBusy('share');
    try {
      const uri = await capture();
      if (!uri) return;
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Indisponível', 'O compartilhamento não está disponível neste dispositivo.');
        return;
      }
      await Sharing.shareAsync(uri);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          Exportar gabarito
        </Text>
        <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
          Baixe a imagem para imprimir ou compartilhe para inserir em um documento de texto.
        </Text>
        <Text variant="caption" color={colors.textMuted} style={styles.hint}>
          Ao imprimir ou inserir no documento, use a opção &quot;Ajustar à página&quot; para o
          gabarito preencher a folha corretamente.
        </Text>

        <View style={[styles.previewWrap, { width: previewWidth, height: previewHeight }]}>
          <View
            style={{
              width: CAPTURE_WIDTH,
              height: captureHeight,
              transform: [{ scale: previewScale }],
              transformOrigin: 'top left',
            }}
          >
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
              <GabaritoSheet exam={exam} width={CAPTURE_WIDTH} />
            </ViewShot>
          </View>
        </View>

        <PillButton title="Baixar imagem" variant="accent" onPress={onSave} disabled={busy !== null} />
        <PillButton title="Compartilhar" variant="outline" onPress={onShare} disabled={busy !== null} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 140,
    gap: spacing.sm,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.xs,
  },
  hint: {
    marginBottom: spacing.md,
  },
  previewWrap: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderRadius: 12,
  },
});
