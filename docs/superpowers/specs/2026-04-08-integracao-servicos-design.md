# Design: Integração de Serviços - Guardiã App

**Data:** 2026-04-08
**Projeto:** Guardiã - Sistema de Proteção para Mulheres

---

## 1. Visão Geral

Este documento detalha a integração de serviços externos ao Guardiã App:
- Verificação de CPF (apicpf.com)
- Consulta de Antecedentes (DataJud/CNJ)
- Pagamentos (Asaas)
- Emails (AWS SES)
- Armazenamento de Análises (MongoDB)

---

## 2. Arquitetura do Sistema

### 2.1 Stack Atual
- **Frontend:** Next.js 16 (App Router)
- **Auth:** AWS Cognito
- **Database (Users/Cadastros):** PostgreSQL (RDS) - mantida por LGPD
- **Database (Análises):** MongoDB Atlas - migração prevista
- **Infra:** AWS ECS Fargate

### 2.2 Fluxo de Integração

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Usuário   │───>│  Next.js API │───>│  Services   │
└─────────────┘    └──────────────┘    └─────────────┘
      │                   │                    │
      │                   v                    v
      │            ┌──────────────┐     ┌─────────────┐
      │            │ PostgreSQL   │     │  MongoDB    │
      │            │ (Users/Cad)  │     │ (Análises)  │
      │            └──────────────┘     └─────────────┘
      │
      v
┌──────────────────────────────────────────────────────┐
│                    Payment Flow                       │
│  Usuário ──> Asaas ──> Webhook ──> Ativar Acesso    │
└──────────────────────────────────────────────────────┘
```

---

## 3. APIs Externas

### 3.1 API CPF (apicpf.com)
- **Endpoint:** `GET https://apicpf.com/api/consulta?cpf={cpf}`
- **Auth:** Header `X-API-KEY`
- **Custo:** ~R$ 0,30-0,50 por consulta
- **Dados retornados:** Nome, DataNascimento, Sexo, NomeMae, SituaçãoCPF

### 3.2 API Antecedentes (DataJud/CNJ)
- **Endpoint:** `GET https://api.cnj.jus.br/api/v2/processos/tribunal/{codigoTribunal}`
- **Auth:** Header `Authorization: APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==`
- **Custo:** Gratuito (API pública CNJ)
- **Dados retornados:** Processos cíveis e criminais,áltimas ocorrências

### 3.3 Asaas (Pagamentos)
- **Ambiente:** Homologação
- **Token:** `$aact_hmlg_...`
- **Webhook:** `/api/asaas/webhook`
- **Custos:** 2,99% + R$ 0,10 por transação

---

## 4. Estrutura de Planos

### 4.1 Tipos de Plano

| Plano | Descrição | Preço |
|-------|-----------|-------|
| **Avulso CPF** | Consulta única de CPF | R$ 19,90 |
| **Avulso Antecedentes** | Consulta única de antecedentes | R$ 29,90 |
| **Avulso Combo** | CPF + Antecedentes | R$ 39,90 |
| **Assinatura Proteção** | 10 análises/mês | R$ 49,90/mês |
| **Assinatura Premium** | 30 análises/mês | R$ 99,90/mês |

### 4.2 Sistema de Tokens
- Usuário compra créditos (tokens)
- Cada análise = 1 token
-Tokens têm validade (30 dias)
- Saldo pode ser transferido entre planos

---

## 5. Painéis

### 5.1 Painel do Usuário
**Funcionalidades:**
- Busca por CPF → exibe dados pessoais
- Busca por CPF → consulta antecedentes automáticamente
- Histórico de consultas realizadas
- Saldo de tokens
- Comprar mais tokens (Asaas)
- Configurações de notificação (email)

**Fluxo:**
1. Usuário faz login (Cognito)
2. Acessa painel de buscas
3. Insere CPF → sistema verifica saldo tokens
4. Se saldo > 0 → consulta CPF + Antecedentes
5. Exibe resultado organizado no painel
6. Decrementa token

### 5.2 Painel Admin
**Funcionalidades:**
- Dashboard: total usuários, consultas hoje, receita
- Lista de usuários com status
- Histórico completo de consultas
- Gestão de planos e preços
- Relatórios exportáveis (CSV/Excel)
- Alertas de risco (violência)
- Configurações do sistema

**Acesso:**
- Rota protegida: `/app/admin`
- Apenas usuários com role `admin`

---

## 6. Database

### 6.1 PostgreSQL (Mantido)
Continua armazenando:
- Users (cadastros com hash LGPD)
- Contacts (contatos analisados)
- Sessions (autenticação)
- LGPD Logs

### 6.2 MongoDB (Novas Análises)
Estrutura proposta para collections:

```javascript
// analises
{
  _id: ObjectId,
  userId: ObjectId,
  cpf: "***.***.***-**", // parcialmente mascarado
  cpfHash: "sha256...",
  cpfDados: {
    nome: "***",
    dataNascimento: "**/**/****",
    situacao: "regular"
  },
  antecedentes: {
    processosCiveis: [],
    processosCriminais: [],
    ultimaAtualizacao: Date
  },
  tokensGastos: Number,
  createdAt: Date
}

// tokens
{
  _id: ObjectId,
  userId: ObjectId,
  quantidade: Number,
  tipo: "avulso" | "assinatura",
  validade: Date,
  usedAt: Date,
  createdAt: Date
}

// assinatura
{
  _id: ObjectId,
  userId: ObjectId,
  plano: "protecao" | "premium",
  status: "ativa" | "cancelada" | "bloqueada",
  asaasSubscriptionId: String,
  monthlyLimit: Number,
  currentMonthUsage: Number,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 7. AWS SES (Emails)

### 7.1 Tipos de Email
- **Boas-vindas:** Ao criar conta
- **Confirmação pagamento:** Quando Asaas confirma
- **Alerta de risco:** Quando análise detecta violência
- **Relatório mensal:** Resumo de uso (assinantes)

### 7.2 Configuração
- **Sender:** noreply@guardia.app (configurar no SES)
- **Templates:** Armazenados no código
- **Queue:** Processar em background

---

## 8. Fluxo de Implementação

### Fase 1: APIs + Painel Usuário
1. Criar lib/services/cpf.ts (apicpf.com)
2. Criar lib/services/datajud.ts (CNJ)
3. Criar página `/app/buscas` (painel usuário)
4. Criar API `/api/busca/cpf` e `/api/busca/antecedentes`
5. Integrar no schema MongoDB

### Fase 2: Tokens + Painel Admin
1. Criar sistema de tokens (compra, uso, validade)
2. Criar dashboard admin `/app/admin`
3. Criar API `/api/admin/users`
4. Criar API `/api/admin/stats`
5. Adicionar Role Admin no Cognito

### Fase 3: Pagamentos Asaas
1. Criar lib/services/asaas.ts
2. Criar página de checkout `/app/checkout`
3. Criar webhook `/api/asaas/webhook`
4. Integrar com sistema de tokens

### Fase 4: Emails + MongoDB
1. Configurar lib/services/email.ts (SES)
2. Migrar análises do PostgreSQL para MongoDB
3. Criar templates de email

---

## 9. Tabela de Custos Estimados

| Item | Custo Mensal Estimado |
|------|----------------------|
| CPF API (500 consultas) | R$ 150-250 |
| Asaas (taxa 3%) | Variável |
| SES (1.000 emails) | ~R$ 5 |
| MongoDB (cluster) | R$ 0-50 (tier free) |
| **Total Infra** | **R$ 200-300** |

**Margem de Lucro:**
- Avulso Combo (R$ 39,90) - custo ~R$ 0,80 = ~R$ 39,10 lucro
- Assinatura R$ 49,90 - 10 análises = R$ 3,99 por análise

---

## 10. Pending Questions

- [ ] Quais tribunais priorizar no DataJud? (TJSP, TJRJ, todos?)
- [ ] Limite de consultas por dia por usuário?
- [ ] Precisa de rate limiting?
- [ ] QR Code Pix para pagamento? (Asaas suporta)

---

## 11. Aprovações

- [ ] Arquitetura Approved
- [ ] Planos de Preço Approved
- [ ] Fluxo de Dados Approved
- [ ] Prioridade de Implementação Approved

---

**Documento criado em:** 2026-04-08
**Próximo passo:** Implementar Fase 1 (APIs + Painel Usuário)