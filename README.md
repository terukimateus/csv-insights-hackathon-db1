# CSV upload and analysis

Aplicação Next.js para upload e análise de arquivos CSV com apoio de IA. O backend sintetiza estatísticas seguras (sem dados sensíveis) e a LLM gera um resumo e sugestões de gráficos a partir dessas estatísticas.

## Como iniciar o projeto

Pré-requisitos:

- Node.js 18+ (recomendado 20)
- PNPM ou NPM (o projeto inclui `pnpm-lock.yaml`, mas os scripts funcionam com NPM)

1. Instale as dependências

```bash
npm install
```

2. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz com sua chave do Google Generative AI:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=YOUR_API_KEY_HERE
```

3. Rode o servidor de desenvolvimento

```bash
npm run dev
```

Abra http://localhost:3000 e faça o upload de um CSV para ver os insights.

Build e produção:

```bash
npm run build
npm start
```

## Arquitetura da solução

Tecnologias principais:

- Next.js 14 (App Router) – UI e API routes
- Tailwind CSS – estilos (ver `app/globals.css` e `styles/globals.css`)
- Recharts – renderização de gráficos no cliente (`components/dynamic-chart.tsx`)
- AI SDK (`ai`, `@ai-sdk/google`) – orquestração da chamada à LLM Gemini
- csv-parse – parsing robusto do CSV no backend
- zod – schema de validação do objeto de saída da LLM

Estrutura relevante:

- `app/page.tsx`: página principal com upload, campo opcional de temas e exibição dos insights/gráficos
- `app/api/csvs/upload/route.ts`: endpoint que recebe o CSV, calcula estatísticas e consulta a LLM
- `components/dynamic-chart.tsx`: componente que escolhe o gráfico (barra, pizza, linha) e infere chaves
- `components/ui/*`: componentes de UI (botões, cards, etc.)
- `lib/utils.ts`: utilitários de UI/estilo

## Fluxo de operação

1. Upload do CSV (cliente)

   - O usuário seleciona ou arrasta um `.csv` em `app/page.tsx`.
   - Opcionalmente, informa “temas” de interesse (ex.: "quantidade de vendas", "valor das vendas").
   - O arquivo e os temas são enviados via `FormData` para `/api/csvs/upload`.

2. Sumarização segura (servidor)

   - O endpoint `app/api/csvs/upload/route.ts` valida a extensão do arquivo.
   - Faz o parsing com `csv-parse` e aplica heurísticas:
     - Detecta delimitador (`,` ou `;`).
     - Converte números no formato pt-BR (1.234,56) e internacional.
     - Identifica colunas numéricas, de categoria e de data.
   - Gera um JSON de agregados (ex.: `topValues` para categorias, `byMonth` para datas, `min/max/mean` para numéricos).
   - Apenas esse JSON é passado para a LLM (sem linhas brutas), reduzindo risco de alucinação e vazamento.

3. Geração de insights por IA

   - Usando `ai` + `@ai-sdk/google` com o modelo `gemini-2.5-flash`.
   - Um schema `zod` define a estrutura esperada: `summary` e `insights` com tipo de gráfico, dados e representação.
   - O prompt inclui regras rígidas: “não inventar números nem categorias; usar apenas o JSON de estatísticas”.
   - Se o usuário forneceu temas, o prompt prioriza insights relacionados, explicando limitações quando o dado não existir.

4. Renderização de gráficos (cliente)
   - `components/dynamic-chart.tsx` recebe cada insight e desenha com Recharts:
     - bar_chart: eixo X categórico e Y numérico
     - pie_chart: `nameKey` e `dataKey`
     - line_chart: séries temporais (ex.: `month` vs `count`)
   - O componente tenta inferir chaves quando não fornecidas e lida com dados vazios de forma resiliente.

## Contrato do endpoint

POST `/api/csvs/upload`

Multipart form-data:

- `csvFile`: arquivo CSV (obrigatório)
- `insightQuery`: string com temas desejados (opcional)

Resposta (200):

```json
{
  "success": true,
  "fileName": "dados.csv",
  "summary": "Resumo em PT-BR...",
  "insights": [
    {
      "type": "bar_chart|pie_chart|line_chart",
      "summary": "...",
      "data": [{ "category": "A", "value": 10 }],
      "chart_representation": {
        "x_axis": "category",
        "y_axis": "value",
        "dataKey": "value",
        "nameKey": "category"
      }
    }
  ],
  "aggregates": { "headers": [], "columns": {} }
}
```

Erros:

- 400: arquivo ausente ou inválido
- 500: falha inesperada no processamento

## Dicas de uso

- Prefira CSVs com cabeçalhos claros e datas no formato `yyyy-mm-dd` ou `dd/mm/yyyy`.
- Use os “temas” para direcionar a análise (ex.: “valor das vendas”, “quantidade por categoria”).
- Se um tema não existir nos dados agregados, o resumo explicará a limitação ao invés de inventar valores.

## Deploy

- Configurar a variável `GOOGLE_GENERATIVE_AI_API_KEY` no provedor (ex.: Vercel Project Settings > Environment Variables).
- Fazer o build: `npm run build`.
- Iniciar: `npm start`.

## Licença

Este projeto é para fins educacionais/demonstração.
