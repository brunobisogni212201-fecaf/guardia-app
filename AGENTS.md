<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Snapshot (2026-04-07)

- App: `guardia-app` (Next.js 16, App Router, Route Handlers)
- Domain: análise de conversas com foco em detecção de risco de violência
- Pipeline atual:
1. Recebe texto da conversa
2. Faz parsing de mensagens
3. Extrai dados de contato
4. Analisa risco com Gemini
5. Anonimiza PII
6. Persiste no PostgreSQL
7. Arquiva no AWS S3 (quando configurado)

---

## Infraestrutura AWS Configurada

### Recursos Criados

| Recurso | ID/Arn | Status |
|---------|--------|--------|
| VPC | vpc-008dd58344144e978 | ✅ Ativa |
| Security Group | sg-04bf05cdace1fdff2 | ✅ Ativo (porta 3000) |
| ECR Repository | 026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app | ✅ Ativo |
| ECS Cluster | guardia-cluster | ✅ Ativo |
| ECS Service | guardia-service | ✅ Online |
| CloudWatch | /ecs/guardia-app | ✅ Ativo |
| RDS | guardia-db-new | ✅ Online |

### Endpoint de Produção
```
https://irisregistro.qzz.io (Configuração DNS pendente)
http://guardia-alb-1653604039.us-east-1.elb.amazonaws.com (ALB)
http://44.204.117.169:3000 (IP direto)
```

### Database RDS
- Endpoint: `guardia-db-new.catawsu2siuo.us-east-1.rds.amazonaws.com`
- Porta: 5432
- Usuário: `guardia`
- Senha: `Guardia2024`
- Banco: `guardia`

### Subnets Disponíveis
- `subnet-05ce334c00ff95efd` (us-east-1a)
- `subnet-0a2a69670b40359f7` (us-east-1c)
- `subnet-0394953375b038f8f` (us-east-1d)

### Credenciais AWS Configuradas
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAQMLRP6G3T3VDU66D
AWS_S3_BUCKET=guardia-uploads-us-east-1
```

---

## Estrutura do Projeto

```
guardia-app/
├── src/
│   ├── app/
│   │   ├── api/analyze/route.ts    # Endpoint principal de análise
│   │   ├── page.tsx                # Frontend React (UI de análise)
│   │   └── ...
│   ├── lib/
│   │   ├── analyzers/violence.ts   # Análise de risco com Gemini
│   │   ├── anonymizer/index.ts     # Anonimização PII
│   │   ├── cloud/aws-s3.ts         # Integração S3
│   │   ├── db/                     # PostgreSQL + Drizzle
│   │   └── gemini/model.ts         # Cliente Gemini
│   └── types/index.ts
├── scripts/
│   ├── deploy.sh                   # Deploy completo
│   ├── deploy-ecr.sh              # Build + push ECR
│   ├── setup-infra.sh             # Criar infraestrutura
│   └── setup-secrets.sh           # Criar secrets
├── aws/
│   └── ecs-task-definition.json    # Task definition template
├── Dockerfile                      # Multi-stage build
├── docker-compose.yml              # Desenvolvimento local
├── next.config.ts                  # Config Next.js (output: standalone)
└── .env                            # Variáveis locais
```

---

## Pipeline de Análise (API `/api/analyze`)

1. **Recebe texto** da conversa (WhatsApp)
2. **Faz parsing** de mensagens (data/hora/autor/conteúdo)
3. **Extrai dados de contato** (telefone, CPF - com hashes)
4. **Analisa risco** com Gemini (score 0-10, padrões, ciclo violência)
5. **Anonimiza PII** antes de persistir
6. **Persiste** no PostgreSQL (conversa, análise, contato)
7. **Arquiva** no S3 (se habilitado)

---

## Como Continuar/Depurar

### Verificar Status do Deploy
```bash
aws ecs describe-services --cluster guardia-cluster --services guardia-service --region us-east-1
```

### Ver Logs
```bash
aws logs tail /ecs/guardia-app --follow --region us-east-1
```

### Redeploy
```bash
# Build e push
docker build -t guardia-app:latest .
docker tag guardia-app:latest 026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app:latest
docker push 026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app:latest

# Atualizar task definition
aws ecs register-task-definition \
  --family guardia-app \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 256 \
  --memory 512 \
  --execution-role-arn arn:aws:iam::026544697783:role/ecsTaskExecutionRole \
  --container-definitions '[{"name":"guardia-app","image":"026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app:latest","essential":true,"portMappings":[{"containerPort":3000,"protocol":"tcp"}],"logConfiguration":{"logDriver":"awslogs","options":{"awslogs-group":"/ecs/guardia-app","awslogs-region":"us-east-1","awslogs-stream-prefix":"ecs"}}}]'

# Redeploy
aws ecs update-service --cluster guardia-cluster --service guardia-service --force-new-deployment --region us-east-1
```

---

## Problemas Conhecidos

### 1. Task falhando (ResourceInitializationError)
- **Causa**: Log group não existia
- **Status**: ✅ Corrigido (log group /ecs/guardia-app criado)

### 2. Task falhando (CannotPullContainerError)
- **Causa**: Imagem Docker sem suporte a linux/amd64
- **Status**: ✅ Corrigido (imagem rebuild com --platform linux/amd64)

---

## Próximos Passos Recomendados

1. ✅ Verificar se o serviço iniciou corretamente (online!)
2. ✅ Adicionar variáveis de ambiente ao container (DATABASE_URL, GEMINI_API_KEY)
3. ✅ Criar banco de dados no RDS (guardia-db-new)
4. Configurar Secrets Manager para credenciais
5. Configurar domínio/SSL (Route 53 + ACM)
4. Configurar domínio/SSL (Route 53 + ACM)

---

## Variáveis de Ambiente Necessárias

```bash
# Banco de dados
DATABASE_URL=postgres://guardia:Guardia2024@guardia-db-new.catawsu2siuo.us-east-1.rds.amazonaws.com:5432/guardia

# IA
GEMINI_API_KEY=AIzaSyBjvHEcQEH0Hmpn88YtVjPlpe1HRW18LEQ

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAQMLRP6G3T3VDU66D
AWS_SECRET_ACCESS_KEY=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
AWS_S3_BUCKET_ANALYSIS=guardia-uploads-us-east-1
```

---

## Notes For Next Agents

- Não acoplar lógica crítica ao upload S3. O fluxo de análise deve continuar funcionando mesmo sem AWS.
- Manter anonimização como etapa obrigatória antes de persistência final e antes de qualquer envio externo.
- Sempre validar guias de versão em `node_modules/next/dist/docs/` antes de mudar APIs/configs do Next.js.

---

## Novas Funcionalidades (2026-04-09)

### Design System Íris
- Paleta de cores: Base (cinzas), Suporte (petróleo/lavanda), Accent (coral)
- Componentes: Button, Input, Textarea, Card, Badge, Alert, Timeline, Tabs
- Tokens de design em CSS variables
- Microcopy completo em PT-BR
- Tom "tech humano, calmo, acolhedor" - sem estética policial

### Landing Page
- Hero com copy impactante sobre violência feminina
- Dados reais (Atlas da Violência 2025, Anuário Segurança Pública 2025)
- Modal de Auth com Login/Register

### Páginas Atualizadas com Novo Design
- `/` - Landing Page ✅
- `/dashboard` - Dashboard protegido ✅
- `/analyze` - Página de análise de conversas ✅ (NOVA)
- `/evidence` - Íris Registro ✅ (NOVA)
- `/privacy` - Política de Privacidade ✅ (ATUALIZADA)
- `/buscas` - Busca preventiva (CPF + Antecedentes) ✅ (NOVA)

### Autenticação Cognito
- User Pool: `us-east-1_iwU4xEMtV`
- Client ID: `6ud0eelquvp1vijcsrb564721k`
- Integração AWS SDK (@aws-sdk/client-cognito-identity-provider)

### LGPD Compliance
- Tabela `users` com todos os dados hasheados (email_hash, name_hash, phone_hash, cpf_hash)
- Tabela `sessions` para gestão de tokens
- Middleware para proteção de rotas

### Fase 1 - Busca Preventiva
- `src/shared/lib/services/cpf.ts` - integração apicpf.com
- `src/shared/lib/services/datajud.ts` - integração CNJ (32 tribunais)
- `src/shared/lib/services/rate-limit.ts` - 10 consultas/hora por IP
- `POST /api/busca/cpf` - endpoint consulta CPF
- `POST /api/busca/antecedentes` - endpoint consulta antecedentes

### Rotas API
- `POST /api/auth/signup` - Criar conta (dados anonimizados)
- `POST /api/auth/signin` - Login (retorna cookie httponly)
- `POST /api/analyze` - Análise de conversa com Gemini

---

## CI/CD Pipeline

### Fluxo de Deploy

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PR/merge  │────▶│    Test     │────▶│   Build     │
│  develop    │     │  Quality    │     │   Staging   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
┌─────────────┐     ┌─────────────┐            ▼
│  Rollback   │◀────│   Deploy    │◀──── ┌─────────────┐
│  on fail    │     │ Production  │      │   Build     │
└─────────────┘     └─────────────┘      │   Main      │
                                         └─────────────┘
```

### Ambientes

| Ambiente | Branch | URL | Auto-deploy |
|----------|--------|-----|------------|
| Staging | develop | https://staging.irisregistro.qzz.io | ✅ Sim |
| Production | main | https://irisregistro.qzz.io | ✅ Sim |

### GitHub Secrets Necessários

Configure os secrets via `./scripts/setup-github-secrets.sh` ou manualmente:

```bash
gh secret set AWS_ACCESS_KEY_ID --body "AKIA..."
gh secret set AWS_SECRET_ACCESS_KEY --body "..."
gh secret set AWS_ACCOUNT_ID --body "026544697783"
gh secret set DATABASE_URL --body "postgres://..."
gh secret set AUTH0_DOMAIN --body "guardial-app.us.auth0.com"
gh secret set AUTH0_CLIENT_ID --body "..."
gh secret set AUTH0_CLIENT_SECRET --body "..."
gh secret set GEMINI_API_KEY --body "..."
gh secret set APICPF_API_KEY --body "..."
gh secret set DATAJUD_API_KEY --body "..."
gh secret set SES_SMTP_HOST --body "email-smtp.us-east-1.amazonaws.com"
gh secret set SES_FROM_EMAIL --body "contato@irisregistro.qzz.io"
gh secret set APP_URL --body "https://irisregistro.qzz.io"
gh secret set ECS_SERVICE_PROD --body "guardia-service"
```

### Scripts de Setup

```bash
# 1. Configurar GitHub Secrets
./scripts/setup-github-secrets.sh

# 2. Criar ambiente staging (se não existir)
./scripts/setup-staging.sh

# 3. Configurar SES para email transacional
./scripts/setup-ses.sh

# 4. Deploy manual (se necessário)
./scripts/deploy.sh
```

---

## CI/CD AWS Nativo (Sem GitHub Actions)

Se você não tem GitHub Actions, use um dos scripts abaixo:

### Opção 1: CodePipeline + CodeCommit (Recomendado)
```bash
# Cria CodeCommit + CodePipeline + EventBridge + Lambda
./scripts/setup-aws-codepipeline.sh
```

### Opção 2: Auto-Deploy via EventBridge
```bash
# Cria CodeCommit + Lambda + EventBridge para auto-deploy
./scripts/setup-auto-deploy.sh
```

### Opção 3: GitHub Webhook + CodePipeline
```bash
# Usa GitHub como source (requer GitHub token)
./scripts/setup-aws-cicd-github.sh
```

### Opção 4: CodePipeline Completo (CLI)
```bash
# Cria tudo via AWS CLI
./scripts/setup-aws-cicd.sh
```

### Fluxo AWS CodePipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  CodeCommit  │────▶│  CodeBuild   │────▶│   S3 Artif.  │────▶│    ECS       │
│  ou GitHub   │     │  npm build  │     │  imageref    │     │  Deploy      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
      │                    │                                           │
      ▼                    ▼                                           ▼
┌──────────────┐     ┌──────────────┐                         ┌──────────────┐
│  EventBridge │────▶│    Lambda    │                         │  CloudWatch  │
│  (trigger)   │     │  (orchestr.) │                         │  (logs)      │
└──────────────┘     └──────────────┘                         └──────────────┘
```

### Comandos úteis AWS

```bash
# Ver pipelines
aws codepipeline list-pipelines --region us-east-1

# Ver status do build
aws codebuild list-builds --project-name guardia-app-build --region us-east-1

# Trigger manual
aws codebuild start-build --project-name guardia-app-build --region us-east-1

# Ver logs
aws logs tail /ecs/guardia-app --follow --region us-east-1

# Status ECS
aws ecs describe-services --cluster guardia-cluster --services guardia-service --region us-east-1
```

---

## AWS SES - Email Transacional

Templates configurados:
- `IrisBemVinda` - Email de boas-vindas
- `IrisAnaliseCompleta` - Notificação de análise pronta
- `IrisAlertaRisco` - Alerta de segurança

Para ativar email em produção:
1. AWS Console > SES > Account Dashboard
2. Clicar em "Request Production Access"
3. Aguardar aprovação da AWS (24-48h)

---

Última atualização: 2026-04-09
Status: Build ✅ | CI/CD AWS ✅ | SES ✅

### Build Status
```
Route (app)                  Revalidate  Expire
┌ ○ /                        Landing page
├ ○ /analyze                 Análise de conversas
├ ○ /buscas                  Busca preventiva
├ ○ /dashboard               Dashboard
├ ○ /evidence                Íris Registro
├ ○ /privacy                 Privacidade
└ ○ /api/health              Health check
```

### Configuração Atual
- **Task Definition**: guardia-app-prod (amd64)
- **RDS**: guardia-db-new (guardia/Guardia2024)
- **ECR**: guardia-app
- **Auth0**: guardial-app.us.auth0.com
- **SES**: Configurado (pending production access)
- **CI/CD**: AWS CodePipeline + CodeBuild + EventBridge ✅