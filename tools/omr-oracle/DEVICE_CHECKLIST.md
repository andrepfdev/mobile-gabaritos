# Checklist OMR em dispositivo (≥99%)

Meta: `correct / total ≥ 0.99` em fotos reais impressas com o layout novo (header acima, ArUco só na grade). Preferir **falha explícita (rescan)** a erro silencioso.

## Preparação

1. Rebuild do APK com o módulo `omr-opencv` (não use Expo Go).
2. Imprima folhas com marcas ArUco IDs 0–3 nos cantos da grade.
3. Gabarito-verdade base: `A B C D E C B D B A` (e 2–3 variantes de preenchimento).
4. No debug da tela de resultado, confirme `motor=OpenCV-ArUco` e `ArUco IDs: [0, 1, 2, 3]`.

## Sessão (N ≥ 20)

Para cada foto, anote:

| # | Condição | motor | IDs 4/4? | respostas OK? | rescan? | notas |
|---|----------|-------|----------|---------------|---------|-------|
| 1 | luz boa, folha plana | | | | | |
| 2 | leve perspectiva | | | | | |
| 3 | sombraação 180° / espelho | | | | | |
| … | … | | | | | |
| 20+ | sombra / fundo escuro | | | | | |

Inclua misturas de:

- Caneta preta e azul
- Folha ligeiramente torta
- Sombra parcial (sem cobrir ArUco)
- Dupla marcação em 1 questão (deve ficar “sem marca”, não chute)
- Folha espelhada / invertida (flip deve corrigir via score ArUco)

## Critérios de aceite

- Taxa de acerto nas questões lidas: ≥ 99% (`correct/total`)
- Taxa de rescan documentada (aceitável se evita falso positivo)
- Nenhuma leitura “silenciosa” com cantos inventados (sem ArUco 4/4)
- Ambiguidade UI dispara perto de 10% em branco / sem marca

## Comandos

```bash
npm run omr:oracle          # regressão sintética JS
cd android
.\gradlew.bat assembleRelease
```
