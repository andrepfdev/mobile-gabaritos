# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Feedback visível ao usuário

O usuário final é um professor leigo em tecnologia. Todo texto que ele vê
(Alert, mensagens de erro/status inline, hints de tela) deve ser escrito em
linguagem simples: nunca citar bibliotecas, motores de visão computacional
(OpenCV), termos como "ArUco", IDs de marcador, ou mensagens de erro
JS/stack traces cruas. Informação técnica de diagnóstico só pode aparecer em
blocos explicitamente marcados como debug/temporário (ex.: os cards
"Diagnóstico (temporário)" em `scan-result.tsx`), nunca nas mensagens
principais de erro/status.

# Assinatura é 100% externa (compliance Apple/Google)

O app segue deliberadamente o modelo "Reader App": a assinatura é vendida e
gerenciada inteiramente no site, fora do app. Isso evita a comissão das lojas
e o risco de rejeição/banimento pela App Store Guideline 3.1.1 e pela
Payments Policy do Google Play (apps que vendem bens digitais consumidos no
próprio app são obrigados a usar IAP/Play Billing e pagar comissão; apps que
só fazem login/gerenciam status de algo contratado fora do app não são).

Regras a manter ao mexer em qualquer tela/fluxo de assinatura
(`api/subscriptions.ts`, `api/payments.ts`, `hooks/useSubscriptionStatus.ts`,
`hooks/useCanCreateExam.ts`, `app/subscription-locked.tsx`,
`app/(tabs)/exams/paywall.tsx`, `app/(tabs)/profile/subscription.tsx`,
`components/subscription/NoActiveSubscriptionCard.tsx`):

- **Nunca** adicionar um fluxo de compra/checkout no app (sem
  `react-native-iap`, RevenueCat, Stripe Checkout embutido, etc.). A única
  mutação permitida sobre assinatura é cancelamento (`useCancelSubscription`),
  que é uma ação de leitura/gestão, não de venda.
- **Nunca** exibir preço, nome comercial de plano com valor, botão
  "Assinar"/"Comprar"/"Fazer upgrade", ou link para a landing page de vendas
  dentro do app. O texto ao usuário sem assinatura ativa deve se limitar a
  constatar o status e oferecer "Verificar Assinatura" (refetch), como em
  `NoActiveSubscriptionCard`.
- Criar conta (nome/e-mail/senha) *dentro* do app é permitido — a restrição
  das lojas é sobre o fluxo de **pagamento**, não sobre cadastro. O funil
  freemium (`FREE_EXAM_LIMIT` em `hooks/useCanCreateExam.ts`) pode continuar
  usando o cadastro in-app normalmente.
- A ativação de uma assinatura é sempre detectada por polling do backend
  (`useSubscriptionStatus`/`useCurrentUser`, status `AUTHORIZED`), disparado
  no foco da tela e no retorno do app ao foreground (`AppState`) — não por
  qualquer callback de pagamento tratado no app.
- Ao submeter o app nas lojas, incluir nas notas de revisão uma conta de
  teste já com assinatura ativa, para o revisor não ficar preso na tela de
  paywall.
