# Projeto Íris - Guardiã App

## Visão Geral

**Íris** (anteriormente "Guardiã") é uma aplicação web para análise de conversas e identificação de padrões de violência psicológica, com proteção de dados sensíveis e suporte a evidências para fins jurídicos.

### Problema

Mulheres vítimas de violência psicológica frequentemente não conseguem provar o abuso:
- Conversas são deletadas pelos agressores
- Falta de documentação sistemática
- Medo de exposição dos dados pessoais

### Solução

Plataforma que:
1. Analisa conversas (WhatsApp) com IA para identificar padrões de abuso
2. Armazena evidências de forma segura e anonimizada
3. Gera relatórios para fins jurídicos
4. Protege dados sensíveis com hash

---

## Funcionalidades

### Pages

| Page | Descrição | Status |
|------|-----------|--------|
| **Landing** | Página inicial com login | ✅ |
| **Dashboard** | Métricas e estatísticas | ✅ |
| **Análise** | Análise de conversas IA | ✅ |
| **Evidências** | Registro de evidências | ✅ |
| **Privacidade** | Política e dados | ✅ |
| **Cadastro** | Cadastro multi-step | ✅ |
| **Buscas** | Busca preventiva CPF | 🔄 |

###APIs

| Endpoint | Descrição |
|----------|-----------|
| `/api/auth/signin` | Login com email |
| `/api/auth/signup` | Registro |
| `/api/auth/callback/google` | Callback OAuth |
| `/api/auth/complete-registration` | Completar cadastro |
| `/api/auth/verify` | Verificar email |
| `/api/analyze` | Análise de conversa |
| `/api/busca/cpf` | Busca CPF |
| `/api/busca/antecedentes` | Busca antecedentes |
| `/api/geo/heatmap` | Heatmap geográfico |
| `/api/geo/record` | Registro geográfico |

---

## Stack Técnica

### Frontend

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- Framer Motion (animações)
- Design System Íris

### Backend

- Next.js Route Handlers
- Drizzle ORM
- PostgreSQL (RDS)
- Auth0 (OAuth)

### Infraestrutura

- AWS ECS (Fargate)
- AWS RDS (PostgreSQL)
- AWS SES (Email)
- AWS ECR (Container Registry)
- AWS ALB (Load Balancer)

### APIs de IA

- Gemini 2.5 Flash (análise)
- APICPF (validação CPF)
- DataJud (antecedentes)

---

## Fluxos de Usuário

### Fluxo 1: Login com Email

```
1. Usuário acessa / (landing)
2. Clica "Entrar com Email"
3. Insere email + senha
4. POST /api/auth/signin
5. Auth0 valida credenciais
6. Cria sessão no banco
7. Redirect /dashboard
```

### Fluxo 2: Login com Google

```
1. Usuário clica "Entrar com Google"
2. Redirect Auth0 (Google OAuth)
3. Usuário autoriza
4. Callback /api/auth/callback/google
5. Busca/Cria usuário por email_hash
6. Se novo → Redirect /register
7. Se existente → Redirect /dashboard
```

### Fluxo 3: Cadastro

```
1. Usuário llega /register?step=complete&token=xxx
2. Preenche dados: CPF, WhatsApp, CEP
3. Valida CPF (APICPF)
4. Geolocaliza (CEP → lat/lng)
5. Hash todos os dados PII
6. Salva no banco
7. Envia email boas-vindas (SES)
8. Redirect /dashboard
```

### Fluxo 4: Análise

```
1. Usuário cola texto do WhatsApp
2. POST /api/analyze
3. Gemini processa e retorna:
   - Score de risco (0-10)
   - Padrões identificados
   - Ciclo de violência
   - Dados de contato extraídos
4. Dados PII hasheados antes de salvar
5. Persiste no PostgreSQL
6. Retorna resultado ao frontend
```

---

## Dados e Privacidade

### PII Armazenado (Hash)

| Campo | Hash | Descrição |
|-------|------|-----------|
| email | SHA-256 | Email do usuário |
| name | SHA-256 | Nome |
| phone | SHA-256 | Telefone |
| cpf | SHA-256 | CPF |
| whatsapp | SHA-256 | WhatsApp |
| cep | SHA-256 | CEP |

### Dados Protegidos

- Localização (lat/lng) apenas em memória
- Sexo biológico (is_female) para estatísticas
- Histórico de análises

---

## Arquitetura de Componentes

```
src/
├── app/                    # Next.js Pages
│   ├── page.tsx           # Landing
│   ├── dashboard/         # Dashboard
│   ├── register/         # Cadastro
│   ├── analyze/          # Análise
│   ├── evidence/        # Evidências
│   ├── privacy/         # Privacidade
│   ├── buscas/          # Buscas
│   └── api/             # Route Handlers
├── shared/
│   ├── design-system/   # Componentes Íris
│   │   └── components/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Alert.tsx
│   │       ├── Badge.tsx
│   │       ├── Tabs.tsx
│   │       └── Timeline.tsx
│   └── lib/
│       ├── db/           # Drizzle ORM
│       ├── email/        # SES SDK
│       ├── utils/       # Hash utilities
│       └── ai/          # Gemini
└── features/
    ├── auth/            # Auth logic
    └── analyze/         # Análise logic
```

---

## Ambientes

| Ambiente | Branch | URL | Deploy |
|----------|--------|-----|--------|
| Desenvolvimento | local | localhost:3000 | Manual |
| Staging | develop | staging.irisregistro.qzz.io | Auto |
| Produção | main | irisregistro.qzz.io | Auto |

---

## Design System

### Cores

| Token | Hex | Uso |
|-------|-----|---|
| base-50 | #FAFAFA | Background claro |
| base-100 | #F4F4F5 | Card background |
| base-200 | #E4E4E7 | Bordas |
| base-500 | #71717A | Texto secundário |
| base-900 | #18181B | Texto principal |
| support-petroleum | #1E3A5F | Buttons, headers |
| support-lavanda | #8B5CF6 | Highlights |
| accent-coral | #F97316 | Alertas, CTAs |

### Tipografia

- Font: Inter
- Headings: 600-700
- Body: 400-500

### Componentes

- Buttons com estados (default, hover, active, disabled)
- Cards com sombra suave
- Inputs com validação
- Alerts contextuais
- Timeline para análises

---

## Métricas de Produto

### KPIs

| Métrica | Meta |
|--------|------|
| Usuários ativos | 1000 |
| Análises realizadas | 5000 |
| Taxa de risco detectada | >60% |
| Tempo de análise | <5s |

---

## Roadmap

### Fase 1 - Fundação (Concluído)
- [x] Landing page
- [x] Dashboard
- [x] Análise básica
- [x] Auth0 + Google

### Fase 2 - Evidências (Em progresso)
- [x] Registro de evidências
- [ ] Busca preventiva
- [ ] Heatmap geográfico
- [ ] Relatórios PDF

### Fase 3 - Escalação
- [ ] CI/CD completo
- [ ] Staging
- [ ] Tests E2E
- [ ] PWA

### Fase 4 - Expansão
- [ ] App mobile
- [ ] Notificações push
- [ ] Integração WhatsApp
- [ ]更多 regiões

---

## Equipe

| Papel | Nome |
|-------|------|
| Produto | Bruno Bisogni |
| Desenvolvimento | Claude Code |

---

##/contato

- Email: contato@irisregistro.qzz.io
- Domínio: https://irisregistro.qzz.io

---

Última atualização: 2026-04-12