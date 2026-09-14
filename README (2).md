# Pedido de Reposição — Rede Nilo

App para geração de pedidos de reposição do depósito para a loja, com leitura de código de barras e checklist de separação.

## Como usar

1. **Montagem do pedido**: escaneie o código de barras (câmera) ou digite manualmente, preencha descrição, quantidade e unidade (UND / CX / FD / KG / PCT), e adicione à lista.
2. **Finalizar**: informe nome/referência do pedido, loja destino e solicitante. O app gera automaticamente:
   - Um **PDF executivo** no padrão visual da Rede Nilo, com coluna de caixa de marcação para conferência manual.
   - O **modo separação** dentro do próprio app: cada item vira um checklist com progresso (X de Y separados), para quem estiver no depósito com o celular.
3. **Novo pedido**: limpa a lista para começar um pedido novo.

## Base de produtos (busca automática de descrição)

- `produtos.json` mapeia **código de barras → descrição**, gerado a partir de `DADOS_GERAL.xlsx` (18.906 produtos únicos, deduplicados por código).
- Ao ler ou digitar o código de barras, o app busca a descrição automaticamente nessa base e preenche o campo. **Se o código não for encontrado, o campo fica livre para digitação manual** — o fluxo não trava.
- O arquivo é carregado uma vez (`fetch('produtos.json')`) e fica em cache no `localStorage` do aparelho, então funciona offline nas próximas vezes.
- **Deve ficar na raiz do repositório**, junto com `index.html`, para o `fetch` relativo funcionar no GitHub Pages.
- Para atualizar a base (novos produtos, descrições revisadas): gere um novo `DADOS_GERAL.xlsx` com as colunas `IDCODBARPROD` e `DESCRICAO`, reexporte para `produtos.json` (mesmo formato `{"codigo": "descricao"}`) e substitua o arquivo no repositório.

## Publicação (GitHub Pages)

1. Suba o conteúdo deste repositório para `suprh-glitch/pedido-reposicao` — **incluindo `produtos.json` na raiz**.
2. Em **Settings → Pages**, selecione a branch `main` e pasta `/ (root)`.
3. O app ficará disponível em: `https://suprh-glitch.github.io/pedido-reposicao/`

## Backend (Google Sheets + Apps Script) — opcional, para sincronizar entre aparelhos

Sem configurar isso, o app funciona 100% localmente (localStorage) em um único aparelho. Com o backend configurado, quem monta o pedido e quem separa no depósito veem o mesmo checklist em tempo real (cada dispositivo atualiza a cada ~6s).

1. Crie uma planilha Google nova (ex.: "Pedido de Reposição — Rede Nilo").
2. Extensões → Apps Script, cole o conteúdo de `Code.gs`.
3. Na barra de funções do editor, selecione `setupSheets` e clique em **Executar** uma vez (autoriza o script e cria as abas `Pedidos` e `Itens` com os cabeçalhos corretos).
4. **Implantar → Nova implantação → Tipo: Aplicativo da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a URL gerada (termina em `/exec`).
6. No app, toque no ⚙️ (Configurações), cole a URL e clique em **Salvar e Testar**.

### Estrutura das abas

- **Pedidos**: `ID | Nome | Loja | Solicitante | Status | DataCriacao | DataFinalizacao | TotalItens | ItensSeparados`
- **Itens**: `ItemID | PedidoID | Barcode | Descricao | Qtd | Unidade | Separado | Ordem`

`Status` assume `Aberto` (em separação) ou `Concluido` (fechado ao iniciar um novo pedido).

### Editar ou excluir um pedido

- Em **📂 Pedidos em Aberto**, cada linha tem ✏️ (carrega o pedido no modo montagem para alterar itens/quantidades/dados) e 🗑️ (exclui o pedido e seus itens definitivamente, com confirmação).
- Dentro de um pedido já aberto (modo separação), os mesmos atalhos aparecem na barra inferior: ✏️ volta para edição, 🗑️ exclui o pedido atual.
- Ao **finalizar uma edição**, o app atualiza o pedido existente no Sheets (`atualizarPedido`) em vez de criar um novo — os itens antigos são substituídos pelos novos e o progresso de separação é reiniciado.

### Fluxo entre aparelhos

- Quem monta o pedido (compras/loja) finaliza normalmente → o app cria o pedido no Sheets e já entra no modo separação local.
- No celular de quem vai separar no depósito, toque em **📂 Pedidos em Aberto** → escolha o pedido → o checklist é carregado e sincronizado automaticamente.
- Cada marcação de item é enviada ao Sheets e replicada para os demais aparelhos que estiverem olhando o mesmo pedido.

## Stack

- HTML/CSS/JS puro, arquivo único (`index.html`).
- Leitura de código de barras: [html5-qrcode](https://github.com/mebjas/html5-qrcode) (via cdnjs).
- Geração de PDF: [jsPDF](https://github.com/parallax/jsPDF) (via cdnjs).
- Persistência local: `localStorage` (chave `nilo_pedido_reposicao_v1`), sempre disponível como cache/fallback.
- Sincronização (opcional): Google Sheets + Apps Script (`Code.gs`), mesmo padrão dos demais apps da rede — payload de escrita enviado como `POST text/plain` (evita preflight CORS do Apps Script), leitura via `GET` com querystring.
- Paleta Rede Nilo: `#1B2A4A` (azul-marinho), `#FFC400` (amarelo), `#E6A100` (amarelo escuro), `#333333` (grafite), `#F7F7F5` (fundo).

## Observações

- Sem o backend configurado, funciona 100% no navegador — não há sincronização entre dispositivos.
- A leitura por câmera exige HTTPS (GitHub Pages já atende) e permissão de câmera no navegador.
- No Apps Script, `LockService` garante que duas pessoas marcando itens do mesmo pedido ao mesmo tempo não corrompam a contagem.
