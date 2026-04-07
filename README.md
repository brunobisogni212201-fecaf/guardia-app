# Guardiã App

Aplicação Next.js para análise de conversas e identificação de padrões de violência psicológica, com anonimização de dados sensíveis e persistência em banco relacional.

## Stack e arquitetura

- Next.js 16 (App Router + Route Handlers)
- React 19 + Tailwind CSS 4
- PostgreSQL + Drizzle ORM
- Gemini (`@google/generative-ai`) para extração e análise semântica
- Integração opcional com AWS S3 para arquivamento de análises anonimizadas

### Fluxo principal

1. O usuário envia texto no frontend (`src/app/page.tsx`).
2. `POST /api/analyze`:
3. Faz parsing da conversa (`src/lib/extractors/conversation.ts`).
4. Extrai contato (`src/lib/extractors/phone.ts`).
5. Analisa risco de violência (`src/lib/analyzers/violence.ts`).
6. Anonimiza conteúdo e persiste resultados no banco (`src/lib/db/*`).
7. Se AWS estiver configurada, envia snapshot anonimizado para S3 (`src/lib/cloud/aws-s3.ts`).

## Configuração local

1. Copie `.env.example` para `.env.local` e preencha os valores.
2. Instale dependências:

```bash
npm install
```

3. Rodar em desenvolvimento:

```bash
npm run dev
```

Se ocorrer erro de watcher (`EMFILE: too many open files`), use o modo estável:

```bash
npm run dev:stable
```

## Variáveis de ambiente

Obrigatórias:
- `DATABASE_URL`
- `GEMINI_API_KEY`

AWS (opcional):
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_ANALYSIS`
- `AWS_S3_ENDPOINT` (opcional)
- `AWS_S3_FORCE_PATH_STYLE` (opcional)

## Scripts

- `npm run dev`: desenvolvimento com Turbopack
- `npm run dev:stable`: fallback estável com polling
- `npm run build`: build de produção
- `npm run start`: inicia build de produção
- `npm run check`: check + fix com Biome
- `npm run db:*`: comandos Drizzle
