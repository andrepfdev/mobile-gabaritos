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
