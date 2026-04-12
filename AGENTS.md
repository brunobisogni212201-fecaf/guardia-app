# Agentes - Íris/Guardiã App

## Objetivo

Completar a refatoração e deploy do projeto Íris/Guardiã na AWS ECS, incluindo:
1. Design System completo (landing page, dashboard, analyze, evidence, privacy)
2. Sistema de autenticação com Auth0 + Google OAuth
3. Cadastro multi-step com CPF, WhatsApp e CEP
4. Todos os dados PII anonimizados com hash
5. Deploy na AWS ECS com HTTPS
6. Email transacional via AWS SES

---

## TODO - Fases de Desenvolvimento

### Fase 1: Infraestrutura e Deploy
- [x] VPC, Security Group, RDS criado
- [x] ECR Repository criado
- [x] ECS Cluster criado
- [x] SES Domain verificado
- [ ] Levantar ECS (desiredCount=1)
- [ ] Configurar HTTPS no ALB

### Fase 2: Autenticação
- [x] Auth0 configurado
- [x] Conexão Google OAuth
- [ ] Testar fluxo completo de login
- [ ] Testar fluxo completo de registro

### Fase 3: Core Features
- [x] Landing page com login
- [x] Dashboard com métricas
- [x] Análise de conversas (Gemini)
- [x] Íris Registro (evidências)
- [x] Página de privacidade
- [ ] Busca preventiva (CPF/antecedentes)
- [ ] Heatmap geográfico

### Fase 4: Melhorias
- [ ] Email transacional completo
- [ ] CI/CD automation
- [ ] Tests
- [ ] PWA

---

## Instruções de Contexto

- Manter tom "tech humano, calmo, acolhedor - sem vibe vigilância"
- Todos os textos em PT-BR
- Paleta de cores: Base (cinzas), Suporte (petróleo/lavanda), Accent (coral)
- Evitar estética policial, cores agressivas, ícones de investigação
- Nome do produto: Íris
- Módulo de evidências: Íris Registro

---

## API de IA

### Gemini (Atual)

```typescript
// src/shared/lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export function getGeminiJsonModel(systemInstruction: string) {
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    systemInstruction,
    generationConfig: { responseMimeType: "application/json" },
  });
}
```

### Bedrock (Futuro - opcional)

Models gratuitos disponíveis:
- `amazon.nova-micro-v1:0` - Free Tier
- `amazon.nova-lite-v1:0` - Free Tier
- `meta.llama3-8b-instruct-v1:0` - Free Tier

---

## Configurações AWS (Data: 2026-04-12)

### Credenciais AWS

```
AWS_ACCESS_KEY_ID=AKIA... (sua access key)
AWS_SECRET_ACCESS_KEY=... (sua secret key)
AWS_REGION=us-east-1
```

### Recursos Criados

| Recurso | ID/Arn | Status |
|---------|--------|--------|
| VPC | vpc-008dd58344144e978 | ✅ Ativa |
| Security Group | sg-04bf05cdace1fdff2 | ✅ Ativo (porta 3000) |
| ECR Repository | 026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app | ✅ Ativo |
| ECS Cluster | guardia-cluster | ✅ Ativo |
| ECS Service | guardia-service | ⚠️ Desligado |
| CloudWatch | /ecs/guardia-app | ✅ Ativo |
| RDS | guardia-db-new | ✅ Online |
| IAM User | iris-ses-smtp | ✅ Criado |
| SES Domain | irisregistro.qzz.io | ✅ Verificado |
| SES DKIM | Ativado (3 tokens) | ✅ Sucesso |

### Endpoints

- **Produção**: https://irisregistro.qzz.io
- **ALB**: http://guardia-alb-1653604039.us-east-1.elb.amazonaws.com
- **RDS Endpoint**: `guardia-db-new.catawsu2siuo.us-east-1.rds.amazonaws.com`

---

## Autenticação Auth0

### Configuração Atual

| Config | Valor |
|--------|-------|
| Domain | `guardial-app.us.auth0.com` |
| Non-interactive Client ID | `vF9Vtuj0vpQbqlrVX5dqIAYct6wJnOyc` |
| Non-interactive Client Secret | `_ffncgyBVLTIjtYQ_9oKaSYWRZEmQYVGtsXRRek7e7Og1_sbL9f4o9J6zdduCRnE` |
| Google Connection ID | `con_PezGJ32NvaJlvgSB` |

---

## AWS SES - Email Transacional

| Config | Valor |
|--------|-------|
| Domínio | `irisregistro.qzz.io` |
| DKIM | ✅ Ativado |
| Email Verificado | `contato@irisregistro.qzz.io` |
| SMTP Host | `email-smtp.us-east-1.amazonaws.com` |

**IMPORTANTE**: Usar AWS SDK v3 (não nodemailer):

```typescript
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
```

---

## Estrutura do Projeto

```
guardia-app/
├── src/app/
│   ├── page.tsx              # Landing page
│   ├── dashboard/page.tsx   # Dashboard
│   ├── register/page.tsx    # Cadastro multi-step
│   ├── analyze/page.tsx      # Análise de conversas
│   ├── evidence/page.tsx     # Íris Registro
│   ├── privacy/page.tsx     # Privacidade
│   ├── buscas/page.tsx     # Busca preventiva
│   └── api/
│       ├── auth/           # signin, signup, signout, callback, verify
│       ├── analyze/         # Análise IA
│       ├── busca/          # CPF, antecedentes
│       └── geo/            # Heatmap, record
├── src/shared/
│   ├── lib/
│   │   ├── db/             # Drizzle ORM
│   │   ├── email/          # SES SDK v3
│   │   ├── utils/          # Hash PII
│   │   └── ai/            # Gemini
│   └── design-system/     # Componentes Íris
└── scripts/
    └── deploy.sh           # Deploy ECS
```

---

## Comandos de Deploy

### Levantar ECS

```bash
# 1. Build e push
COMMIT_SHA=$(git rev-parse --short HEAD)
docker build -t guardia-app:${COMMIT_SHA} --platform linux/amd64 .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 026544697783.dkr.ecr.us-east-1.amazonaws.com
docker tag guardia-app:${COMMIT_SHA} 026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app:${COMMIT_SHA}
docker push 026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app:${COMMIT_SHA}

# 2. Update task definition (pega revision)
aws ecs register-task-definition --family guardia-app ... | jq -r '.taskDefinition.revision'

# 3. Deploy
aws ecs update-service --cluster guardia-cluster --service guardia-service --task-definition guardia-app:REVISION --desired-count 1 --force-new-deployment
```

### Debug

```bash
# Status
aws ecs describe-services --cluster guardia-cluster --services guardia-service

# Logs
aws logs tail /ecs/guardia-app --follow

# SES
aws ses get-identity-verification-attributes --identities "irisregistro.qzz.io"
```

---

## Variáveis de Ambiente (.env)

```bash
# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA... (sua access key)
AWS_SECRET_ACCESS_KEY=... (sua secret key)

# Database
DATABASE_URL=postgres://guardia:Guardia2024@guardia-db-new.catawsu2siuo.us-east-1.rds.amazonaws.com:5432/guardia

# Auth0
AUTH0_DOMAIN=guardial-app.us.auth0.com
AUTH0_CLIENT_ID=vF9Vtuj0vpQbqlrVX5dqIAYct6wJnOyc
AUTH0_CLIENT_SECRET=... (seu client secret)

# SES
SES_FROM_EMAIL=contato@irisregistro.qzz.io

# APIs
GEMINI_API_KEY=... (sua chave)
APICPF_API_KEY=... (sua chave)
DATAJUD_API_KEY=... (sua chave)

# App
APP_URL=https://irisregistro.qzz.io
```

---

## Pendências

1. [ ] Levantar ECS (desiredCount=1)
2. [ ] Testar fluxo completo de registro
3. [ ] Configurar HTTPS no ALB
4. [ ] Testar todas as páginas protegidas

---

Última atualização: 2026-04-12