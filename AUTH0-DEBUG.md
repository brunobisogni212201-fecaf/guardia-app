# Análise: Por que o Auth0 não funciona corretamente

## Diagnóstico

Após análise do código, identificamos os seguintes problemas:

---

## 1. Fluxo de Login Duplicado

### Problema
O código tem **duas implementações de signup**:
- `/api/auth/signup` - usa Auth0 diretamente
- `/features/auth/signup/route.ts` - usa Cognito (não usado)

###impacto
- Confusão sobre qual fluxo usar
- Código redundante
- Manutenção difícil

---

## 2. Erros Comuns no Auth0

### A) Client Secret pode estar errado
```typescript
// Em signin/route.ts
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
```
Se a variável não estiver configurada no ambiente de produção, o login falha.

### B) Realm configured incorretamente
```typescript
realm: "Username-Password-Authentication",
```
Se a conexão no Auth0 não tiver esse nome exato, falha.

### C) Audience inválido
```typescript
const AUTH0_AUDIENCE = `https://${AUTH0_DOMAIN}/api/v2/`;
```
Se não for uma API válida no Auth0, o token não funciona.

---

## 3. Fluxo Atual vs Ideal

### Atual (problemas)
1. Usuário preenche email/senha no frontend
2. POST `/api/auth/signin` com `action=login`
3. Se usuário não existe, tenta Auth0 login → falha
4. Se usuário existe, cria sessão

### Problema: O código faz signup + login no mesmo endpoint!

```typescript
// signin/route.ts linha 44-64
if (action === "register") {
  // Faz signup no Auth0
}
// Depois faz login
```

Isso causa erros quando o usuário já existe no Auth0 mas não existe no banco local.

---

## 4. Soluções Propostas

### Solução 1: Separar endpoints
```
POST /api/auth/signup  → apenas criar conta
POST /api/auth/signin  → apenas fazer login
```

### Solução 2: Usar Auth0 SDK oficial
Substituir fetch manual por `@auth0/nextjs-auth0` que já está instalado.

### Solução 3: Adicionar logs mais detalhados
Capturar erros específicos do Auth0 para debug.

---

## 5. Checklist de Verificação

- [ ] AUTH0_CLIENT_ID está correto no .env
- [ ] AUTH0_CLIENT_SECRET está correto no .env  
- [ ] Connection "Username-Password-Authentication" existe no Auth0
- [ ] Client tem許可 (grant types) para password realm
- [ ] Callback URLs estão configuradas no Auth0
- [ ] Allowed Web Origins inclui o domínio

---

## 6. Como Testar

```bash
# Testar login com curl
curl -X POST https://irisregistro.qzz.io/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@exemplo.com","password":"Senha123!"}'

# Ver resposta
# Se "Email ou senha incorretos" → problema de credenciais
# Se "Erro ao processar" → problema de código
```

---

## 7. Alternativas Considered

| Opção | Prós | Contras |
|-------|------|---------|
| Manter Auth0 atual | Já implementado | Bugs de fluxo |
| Auth0 SDK completo | Mais robusto | Mudança grande |
| Usar só sessão DB | Simplicidade | Sem OAuth |
|替ros provedores (Google) | Já funciona |Só um provider |

---

Última atualização: 2026-04-12