# Pedido de Reposição — Rede Nilo

App para geração de pedidos de reposição do depósito para a loja, com leitura de código de barras e checklist de separação.

## Como usar

1. **Montagem do pedido**: escaneie o código de barras (câmera) ou digite manualmente, preencha descrição, quantidade e unidade (UND / CX / FD / KG / PCT), e adicione à lista.
2. **Finalizar**: informe nome/referência do pedido, loja destino e solicitante. O app gera automaticamente:
   - Um **PDF executivo** no padrão visual da Rede Nilo, com coluna de caixa de marcação para conferência manual.
   - O **modo separação** dentro do próprio app: cada item vira um checklist com progresso (X de Y separados), para quem estiver no depósito com o celular.
3. **Novo pedido**: limpa a lista para começar um pedido novo.

## Publicação (GitHub Pages)

1. Suba o conteúdo deste repositório para `suprh-glitch/pedido-reposicao`.
2. Em **Settings → Pages**, selecione a branch `main` e pasta `/ (root)`.
3. O app ficará disponível em: `https://suprh-glitch.github.io/pedido-reposicao/`

## Stack

- HTML/CSS/JS puro, arquivo único (`index.html`), sem backend.
- Leitura de código de barras: [html5-qrcode](https://github.com/mebjas/html5-qrcode) (via cdnjs).
- Geração de PDF: [jsPDF](https://github.com/parallax/jsPDF) (via cdnjs).
- Persistência local: `localStorage` (chave `nilo_pedido_reposicao_v1`) — não depende de Google Sheets/Apps Script.
- Paleta Rede Nilo: `#1B2A4A` (azul-marinho), `#FFC400` (amarelo), `#E6A100` (amarelo escuro), `#333333` (grafite), `#F7F7F5` (fundo).

## Observações

- Funciona 100% no navegador — não há sincronização entre dispositivos. Se precisar que vários separadores acompanhem o mesmo pedido em tempo real, é necessário evoluir para um backend (Google Sheets + Apps Script, como os demais apps da rede).
- A leitura por câmera exige HTTPS (GitHub Pages já atende) e permissão de câmera no navegador.
