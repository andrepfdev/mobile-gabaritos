import React, { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { PillButton } from '../../../../components/ui/PillButton';
import { AlignmentGuide } from '../../../../components/gabarito/AlignmentGuide';
import { colors, spacing } from '../../../../theme/tokens';
import { useExamStore } from '../../../../store/examStore';
import { useScanStore } from '../../../../store/scanStore';
import { buildGabaritoLayout, optionsForCount } from '../../../../lib/gabarito/layout';
import { analyzeGabarito } from '../../../../lib/gabarito/scan';

export default function ScanGabarito() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const exams = useExamStore((s) => s.exams);
  const answerKeys = useExamStore((s) => s.answerKeys);
  const setResult = useScanStore((s) => s.setResult);

  const exam = exams.find((e) => e.id === examId);
  const answerKey = answerKeys.find((k) => k.examId === examId);
  const layout = exam ? buildGabaritoLayout(exam.questionCount, optionsForCount(exam.optionsCount)) : null;

  const [permission, requestPermission] = useCameraPermissions();
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!exam) return;
      if (data === exam.id) {
        setCodeVerified(true);
        setCodeError(null);
      } else {
        setCodeVerified(false);
        setCodeError('Esta folha pertence a outra prova.');
      }
    },
    [exam],
  );

  const onCapture = async () => {
    if (!cameraRef.current || capturing || !layout) return;
    setCapturing(true);
    // TEMPORARY profiling — wall-clock split of each phase, surfaced only in the
    // "Diagnóstico (temporário)" debug card on the result screen. Remove once the
    // real bottleneck in this pipeline is identified and addressed.
    const t0 = Date.now();
    try {
      let normalizedUri: string;
      let t1 = t0;
      let t2 = t0;
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
        t1 = Date.now();
        if (!photo?.uri) {
          throw new Error('A câmera não retornou uma foto.');
        }
        // Re-encodes the photo, which bakes the EXIF orientation into the actual pixel buffer —
        // without this, Skia's raw decode can read the image sideways relative to what the
        // camera preview (and our alignment guide) showed, breaking the percentage-based sampling.
        // Resize for memory; keep JPEG near-lossless so ArUco modules survive re-encode.
        // Single JPEG encode (bake EXIF + resize). loadGray reads bytes without re-encoding.
        const normalized = await manipulateAsync(photo.uri, [{ resize: { width: 1600 } }], {
          compress: 1,
          format: SaveFormat.JPEG,
        });
        t2 = Date.now();
        normalizedUri = normalized.uri;
      } catch {
        Alert.alert('Não foi possível capturar a foto', 'Tente novamente.');
        return;
      }

      // Runs the full detect+warp+bubble-read pipeline once here (instead of a cheap
      // detect-only gate followed by a second full pass on the result screen) — the same
      // ArUco corners are known upfront from `layout`, so there's nothing left to redo later.
      try {
        const { answers, debug } = await analyzeGabarito(normalizedUri, layout);
        const t3 = Date.now();
        setResult({
          photoUri: normalizedUri,
          answers,
          debug,
          timings: {
            captureMs: Math.round(t1 - t0),
            resizeMs: Math.round(t2 - t1),
            analyzeMs: Math.round(t3 - t2),
            totalMs: Math.round(t3 - t0),
          },
        });
        router.push(`/exams/${examId}/scan-result`);
      } catch {
        Alert.alert(
          'Não identificamos os cantos da folha',
          'Reenquadre a folha, garanta boa iluminação e capture de novo.',
        );
      }
    } finally {
      setCapturing(false);
    }
  };

  if (!exam || !answerKey || !layout) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <Text variant="body">Configure o gabarito antes de escanear.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return <SafeAreaView style={styles.container} edges={['top']} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <Card variant="light" style={styles.permissionCard}>
            <Text variant="h2" weight="bold">
              Permitir acesso à câmera
            </Text>
            <Text variant="body" color={colors.textMuted} style={styles.permissionSubtitle}>
              Precisamos da câmera para escanear o gabarito preenchido.
            </Text>
            <PillButton title="Permitir acesso" variant="accent" onPress={requestPermission} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onBarcodeScanned}
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <Card variant={codeVerified ? 'pink' : 'light'} style={styles.tipCard}>
          <Text variant="caption" weight="medium">
            {codeError ??
              (codeVerified
                ? `Código: ${exam.code}. Agora alinhe os 4 marcadores por dentro da área de captura.`
                : 'Alinhe a folha e aponte a câmera code para o QR da prova.')}
          </Text>
        </Card>

        {/* Guide lives in the free band between tip + footer so it is not clipped/pushed high. */}
        <AlignmentGuide layout={layout} fillParent active={codeVerified} />

        <View style={styles.footer}>
          <Text variant="caption" color={colors.white} style={styles.hint}>
            Caneta preta ou azul. Prefira preencher bem o círculo (aceita preenchimento parcial).
            Enquadre os 4 marcadores dos cantos da folha, fundo claro, luz uniforme — sem teclado atrás.
          </Text>
          <PillButton
            title={
              capturing ? 'Validando marcas...' : codeVerified ? 'Capturar e ler' : 'Aguardando QR da prova'
            }
            variant="accent"
            onPress={onCapture}
            disabled={!codeVerified || capturing}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  permissionCard: {
    alignItems: 'flex-start',
  },
  permissionSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  overlay: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  tipCard: {
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hint: {
    textAlign: 'center',
  },
});
