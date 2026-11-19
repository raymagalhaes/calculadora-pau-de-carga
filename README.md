# Calculadora de Pau de Carga

PWA em português para estimar o equilíbrio estático de um pau de carga no plano vertical. Funciona com ângulos digitados ou medidos pelo acelerômetro. Os arquivos são servidos diretamente pelo GitHub Pages, sem compilação.

## Publicar pelo celular Android

1. No Chrome, entre na sua conta do GitHub e abra este repositório. Se a aba **Settings** não aparecer, use **⋮ → Para computador**.
2. Em **Settings → Pages**, vá a **Build and deployment**. Em **Source**, selecione **Deploy from a branch**.
3. Selecione `main` e `/ (root)`. Toque em **Save** e aguarde a publicação. A aba **Actions** mostra o andamento do deploy.
4. Abra o endereço HTTPS que aparecer em **Settings → Pages**. Para este repositório, o endereço esperado é `https://raymagalhaes.github.io/calculadora-pau-de-carga/`.

## Instalar no Android

1. Abra a página publicada no Chrome. Aguarde a indicação de que o aplicativo está disponível offline.
2. Toque em **Instalar** no aplicativo ou em **⋮ → Instalar app** no Chrome. Dependendo da versão, a opção fica em **Adicionar à tela inicial**.
3. Abra o aplicativo pelo ícone. Para conferir o acesso offline, feche o aplicativo, ative o modo avião e abra novamente. Os parâmetros, as medições registradas, a calibração e o tema ficam salvos neste dispositivo.

## Medir e interpretar

- Com a estrutura parada, alinhe o lado comprido do celular ao trecho reto que deseja medir. Para calibrar, mantenha o celular imóvel na vertical, com o topo para cima, e toque em **Calibrar na vertical**.
- Toque em **Medir pau** ou **Medir cabo**, aguarde a coleta e use **Registrar** para aplicar a leitura de cada elemento. A repetição preserva o ângulo anterior até o registro. Se o Chrome bloquear o sensor ou o aparelho não fornecer leituras, digite os ângulos diretamente.
- Use a fixação no pau como referência para informar o lado e a altura da ancoragem. O desenho adota o pau inclinado para a direita. Para cabo horizontal, basta o lado. Para cabo vertical, basta indicar se a ancoragem está acima ou abaixo. A aceleração mede a inclinação do eixo do celular e a identificação da ancoragem é feita pelo usuário.
- Na configuração inicial, a direção da ancoragem fica em aberto. Para conferir um exemplo com os valores iniciais, selecione **Oposto à inclinação do pau (esquerda)**. A tração resultante é 324 kgf (3,18 kN) e o momento é 1.145,51 kgf·m.
- As tabelas mantêm os outros parâmetros e a direção orientada do cabo constantes. Um travessão indica que não há resultado aplicável. O comprimento desenhado do cabo é esquemático.

## Modelo

A inclinação `θ` começa na vertical ascendente e cresce em direção à direita. A direção orientada `φ` segue a mesma convenção, com valores negativos à esquerda. O momento gravitacional é `(P + Wc + We/2) × L × sen(θ)` em kgf·m. O braço orientado da tração é `d × sen(φ − θ)`. Para momento gravitacional positivo, o braço precisa ser negativo para haver equilíbrio com tração. Um braço nulo ou quase nulo é singular. A conversão de kgf para kN usa o fator `0,00980665`.

Os resultados são estimativas de equilíbrio estático idealizado e não representam capacidade segura de içamento. O aplicativo não verifica resistência estrutural, ancoragens, cabos, roldanas, efeitos dinâmicos ou demais componentes.

## Atualizar

Ao alterar os arquivos servidos, incremente a versão do cache em `sw.js` no mesmo commit. Depois da publicação, abra o app com internet para baixar a atualização e feche todas as janelas do app para ativar a nova versão na próxima abertura.
