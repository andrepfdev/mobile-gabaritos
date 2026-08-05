# ProvaZero

App mobile para correção de gabaritos escolares. A marcação de respostas e o cálculo de resultados rodam 100% localmente no dispositivo; a API remota ([api.provazero.app.br](https://api.provazero.app.br)) cuida apenas de cadastro/login e assinatura de planos.

## Stack

- Expo + TypeScript + `expo-router`
- `react-native-svg` (gráficos desenhados à mão: gauge e barras)
- `@tanstack/react-query` (dados de servidor: auth, planos, assinatura)
- `zustand` + AsyncStorage (dados locais: provas, gabaritos, respostas, resultados)
- `expo-secure-store` (tokens JWT)

## Pré-requisitos

- Node.js 20+ e npm
- **Dev client / APK próprio** para leitura OMR com OpenCV (módulo nativo `modules/omr-opencv`). O **Expo Go não inclui** esse módulo — a correção por câmera no Android exige rebuild nativo (`npx expo run:android` ou `assembleRelease`).
- Emulador Android (Android Studio) ou aparelho físico com o APK/dev-client instalado
- Simulador iOS (Xcode, apenas macOS) — ArUco nativo ainda é stub/`unavailable` no iOS nesta fase

## Instalação

```bash
npm install
```

## Rodando o app

```bash
npm start
```

Isso abre o Metro Bundler com um QR code no terminal. Opções:

- **Celular físico (recomendado)**: abra o app Expo Go e escaneie o QR code. Celular e computador precisam estar na mesma rede Wi-Fi (se não funcionar, rode `npx expo start --tunnel`).
- **Emulador Android**: com um emulador já aberto no Android Studio, rode `npm run android` (ou pressione `a` no terminal do Metro).
- **Simulador iOS** (só macOS): `npm run ios` (ou pressione `i`).
- **Web** (útil para conferir layout rapidamente no navegador): `npm run web`.

Na primeira execução o app faz o seeding de 3 provas de exemplo (armazenadas localmente) para já haver dado para visualizar nas telas de Estatísticas e Provas.

### Emulador Android via terminal (sem abrir o Android Studio)

Útil quando não dá pra usar a GUI do Android Studio (ex.: sessão remota/CI) ou
só pra automatizar. Pressupõe um AVD já criado (Android Studio → Device
Manager, uma vez só).

```bash
export ANDROID_HOME=~/Android/Sdk   # ajuste para o caminho real do seu SDK
export PATH=$PATH:$ANDROID_HOME/platform-tools

# 1. Listar os AVDs disponíveis (o nome exato é o que vai em -avd, não o
#    nome "bonito" mostrado no Device Manager)
$ANDROID_HOME/emulator/emulator -list-avds

# 2. Subir o emulador em background
nohup $ANDROID_HOME/emulator/emulator -avd <nome-do-avd> -no-snapshot -no-boot-anim \
  > /tmp/emulator.log 2>&1 &

# 3. Esperar o dispositivo aparecer no adb...
adb wait-for-device

# 4. ...e o boot terminar de fato (adb devices já mostra o device antes do
#    Android estar realmente pronto para instalar/abrir apps)
adb shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done'

# 5. Build nativo + instalação + abertura do app (ver aviso no início deste
#    README sobre Expo Go não servir para o módulo omr-opencv)
npx expo run:android
```

Comandos úteis pra inspecionar/depurar o emulador já rodando:

```bash
adb devices                                   # lista dispositivos/emuladores conectados
adb shell screencap -p /sdcard/screen.png &&  \
  adb pull /sdcard/screen.png ./screen.png    # screenshot
adb shell input tap <x> <y>                   # toque (coordenadas em pixels reais do device,
                                               # não os pixels "lógicos" de um screenshot redimensionado)
adb shell input text "texto sem espaço"       # espaços em input text quebram — use %s no lugar
adb shell input keyevent 4                    # botão "voltar" do Android
```

Primeira vez tocando em qualquer campo de texto, o emulador pode abrir um
popup do sistema "Try out your stylus" por cima do teclado, atrapalhando
input automatizado. Desativa de vez com:

```bash
adb shell settings put secure stylus_handwriting_enabled 0
```

## Testando o fluxo do app

### Onboarding e autenticação
1. Na primeira abertura, o app mostra o onboarding (4 slides) — arraste para o lado e toque em "Próximo"/"Começar".
2. Você cai na tela de login. A API (`https://api.provazero.app.br`) já está no ar — crie uma conta em "Cadastre-se" (nome, e-mail, senha com 8+ caracteres) ou entre com uma conta existente.
3. Login bem-sucedido leva à aba **Estatísticas**.

### Estatísticas e Provas
- Aba **Estatísticas**: cards de resumo (provas hoje, correções pendentes, tempo médio, gráfico de barras por dia da semana, gauge de taxa de conclusão).
- Aba **Provas**: filtros no topo, abas de status (A corrigir / Em andamento / Revisão) e cards de prova com prazo, tag de prioridade e barra de progresso (ou tag "Em espera").

### Fluxo de correção manual (núcleo do app)
1. Na aba Provas (ou Início), toque em **"+"** / "Criar prova" para cadastrar uma nova avaliação (título, disciplina, turma, nº de questões, prazo).
2. Na tela de detalhe da prova, toque em **"Configurar gabarito"** e marque a alternativa correta (A–E) de cada questão.
3. Adicione um aluno pelo campo "Nome do aluno" + "Adicionar".
4. Toque em **"Corrigir"** ao lado do aluno, marque as respostas dele e salve.
5. O app calcula o resultado localmente (função pura em `lib/localDb/grading.ts`) e mostra a tela de **Resultado**: percentual de acerto, acertos/erros e revisão questão a questão (verde = certo, vermelho = errado).

Para conferir a matemática: um gabarito de 10 questões com 8 respostas corretas deve mostrar exatamente **80%**.

### Perfil, planos e assinatura
- Aba **Perfil**: dados do usuário logado (via `GET /users/me`), edição de nome (`PATCH /users/me`) e atalho para assinatura.
- **Ver planos**: lista os planos reais vindos de `GET /plans` (Mensal/Semestral/Anual).
- **Assinar**: chama `POST /subscriptions` e abre o checkout do Mercado Pago no navegador (`initPoint`). Depois de voltar ao app, `GET /subscriptions/me` é reconsultado automaticamente.
- **Assinatura ativa**: mostra status atual, opção de cancelar (`DELETE /subscriptions/me`) e histórico de pagamentos (`GET /payments/me`).

### Testando o refresh automático de token
Para simular expiração do access token e validar o interceptor de refresh, force um logout indireto: aguarde o token expirar naturalmente, ou invalide manualmente o valor salvo no `expo-secure-store` via um rebuild de dev client — não há atalho de UI para isso nesta versão.

## Scripts úteis

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npx expo export --platform android   # valida que o bundle Metro compila sem erros, sem precisar de emulador
```

## Estrutura do projeto

```
app/            rotas (expo-router): (onboarding), (auth), (tabs)/{exams,statistics,profile}
components/     ui/ (primitivas de design system), exam/ (prova), auth/ (formulários)
theme/          tokens.ts (cores/espaçamento/tipografia), fonts.ts
api/            client HTTP, tokenStorage, interceptor de refresh, hooks por endpoint
store/          authStore e examStore (zustand)
lib/localDb/    schema, repositório AsyncStorage e grading.ts (correção pura)
```

## Leitura OMR (Android + OpenCV)

Inspirado no fluxo do **ENEM/INEP** (digitalização + reconhecimento óptico do cartão-resposta), adaptado ao celular:

| ENEM (indústria) | ProvaZero (app) |
|------------------|-----------------|
| Scanner OMR com marcas de registro | ArUco DICT_4X4 nos 4 cantos da grade |
| Ambiente controlado / digitalização | Gate 4/4 + captura JPEG único + fundo claro |
| Caneta preta, círculo cheio | Preta ou azul; aceita preenchimento parcial (core + soft density) |
| Densidade de tinta na bolha | ArUco em BT.601; bolhas em `min(R,G)` + core/fill + CLAHE leve |
| Duas marcas → anula questão | Dupla marcação → em branco (nunca chute) |
| TRI na nota | % simples de acertos (escopo escolar) |

- Módulo `omr-opencv`: EXIF → CLAHE/`detectMarkers`/`CORNER_REFINE_SUBPIX` → flip por score → `warpPerspective` → CLAHE no canônico → bolhas.
- Sem 4 marcas ArUco → rescan explícito. iOS ainda é stub.
- Rebuild após mudar código nativo:

```bash
npx expo prebuild --platform android   # se necessário
cd android && .\gradlew.bat assembleRelease
```

- Checklist de validação em dispositivo (≥20 fotos reais): [`tools/omr-oracle/DEVICE_CHECKLIST.md`](tools/omr-oracle/DEVICE_CHECKLIST.md)
- Oracle sintético (JS, sem OpenCV nativo): `npm run omr:oracle`

### Gerando um APK localmente (sem travar a máquina)

O build nativo compila o OpenCV via CMake para 4 arquiteturas de CPU
(`armeabi-v7a, arm64-v8a, x86, x86_64` — ver `reactNativeArchitectures` em
`android/gradle.properties`). Rodar as 4 em paralelo com o paralelismo padrão
do Gradle (1 worker por núcleo) pode consumir toda a RAM da máquina e travá-la.
Para gerar um APK de teste para **celular físico** (a grande maioria usa
`arm64-v8a`), restrinja a build a uma única arquitetura e limite os workers
via linha de comando (sem alterar `gradle.properties`, que fica valendo para
todo o time/CI):

```bash
# 1. Gera o projeto nativo Android (só precisa rodar de novo se mudar
#    módulos nativos, plugins do app.json ou fizer `git clean`/reset do
#    projeto)
npx expo prebuild --platform android --no-install

# 2. Compila o APK debug, restrito a arm64-v8a e com paralelismo limitado
cd android
export ANDROID_HOME=~/Android/Sdk   # ajuste para o caminho real do seu SDK
nice -n 15 ./gradlew :app:assembleDebug \
  -PreactNativeArchitectures=arm64-v8a \
  --max-workers=4
```

O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk`. Instale
com `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` ou
transferindo o arquivo para o aparelho.

Notas:
- Se a máquina travar mesmo assim, reduza `--max-workers` (ex.: `2`) ou rode
  sem `-PreactNativeArchitectures` só quando realmente precisar de um APK
  universal (todas as arquiteturas) — nesse caso reserve bastante RAM livre e
  feche outros programas antes.
- `./gradlew --stop` encerra o Gradle Daemon caso ele fique consumindo CPU/RAM
  depois que o comando já terminou (ou foi interrompido no meio).

### Scripts de release (Android e iOS)

Scripts prontos que limpam caches nativos problemáticos (o `gradlew clean`
padrão quebra o ciclo CMake/codegen) e geram o artefato final:

| Script | Plataforma | O que faz |
|--------|------------|-----------|
| [`scripts/android-release.ps1`](scripts/android-release.ps1) | Windows | Remove `android/app/.cxx`, `app/build`, `build`; roda `gradlew.bat assembleRelease` |
| [`scripts/android-release.sh`](scripts/android-release.sh) | Linux/macOS | Equivalente ao `.ps1` acima, via `gradlew` |
| [`scripts/ios-release.sh`](scripts/ios-release.sh) | macOS | `pod install` (se necessário) → limpa `ios/build` → `xcodebuild archive` → exporta `.ipa` se existir `ios/ExportOptions.plist` |

```bash
npm run android:apk      # Windows (PowerShell)
npm run android:apk:sh   # Linux/macOS
npm run ios:release      # macOS — exige Xcode instalado
```

Saída:
- Android: `android/app/build/outputs/apk/release/app-release.apk`
- iOS: `ios/build/ProvaZero.xcarchive` (e `ios/build/*.ipa` se o export estiver
  configurado). Sem `ios/ExportOptions.plist` (method + `teamID`), o script
  para no archive assinado e avisa como gerar o `.ipa` — não há assinatura
  automática configurada no projeto ainda.
- Para build de produção assinado, use `assembleRelease` (exige keystore
  configurado) ou o EAS Build (`npx eas build --platform android`), que roda
  na nuvem e não consome recursos da máquina local.

## Notas e limitações da v1

- Leitura OMR por câmera no Android depende do módulo OpenCV nativo; iOS ainda usa fallback JS / `unavailable`.
- Fonte usada é **Inter** como substituta de **General Sans** (arquivos reais ainda não fornecidos); basta trocar `theme/fonts.ts` quando os arquivos oficiais estiverem disponíveis.
- Sem dark mode nesta versão.
