# Status do Projeto Guardiã - Íris Registro

**Data**: 2026-04-09  
**URL**: https://irisregistro.qzz.io

---

## ✅ Concluído

### Infraestrutura AWS
- ✅ ECS Cluster rodando (guardia-cluster)
- ✅ ECS Service ativo (guardia-service)
- ✅ ALB configurado (guardia-alb-1653604039.us-east-1.elb.amazonaws.com)
- ✅ RDS PostgreSQL online (guardia-db.catawsu2siuo.us-east-1.rds.amazonaws.com)
- ✅ MongoDB Atlas configurado
- ✅ Cognito User Pool ativo (us-east-1_iwU4xEMtV)
- ✅ S3 Bucket criado (guardia-uploads-us-east-1)
- ✅ ECR Repository com imagem Docker

### Aplicação
- ✅ Next.js 16 com App Router
- ✅ Autenticação com AWS Cognito
- ✅ Análise de conversas com Gemini AI
- ✅ Anonimização de dados (LGPD compliant)
- ✅ Chart.js para dashboards
- ✅ Framer Motion para animações
- ✅ Three.js para gráficos 3D

### Banco de Dados
- ✅ PostgreSQL (RDS) - Dados estruturados
- ✅ MongoDB Atlas - Logs e análises
- ✅ Schema Drizzle ORM configurado

---

## ⏳ Em Andamento

### DNS e SSL
- ⏳ Propagação DNS (irisregistro.qzz.io → ALB)
  - Registro CNAME configurado
  - Aguardando propagação (5-30 minutos)
  
- ⏳ Certificado SSL solicitado
  - ARN: `arn:aws:acm:us-east-1:026544697783:certificate/2ac37da9-62c8-4f9e-82d0-20d2798afc57`
  - Status: Aguardando validação DNS
  - Registro de validação:
    ```
    Nome: _8fb35ebd0764d17fed3ed052aa1a6c7d.irisregistro.qzz.io
    Tipo: CNAME
    Valor: _2336bc864a675bab6bf1a609dd737472.jkddzztszm.acm-validations.aws
    ```

---

## 📋 Próximos Passos

### 1. Aguardar Propagação DNS
```bash
# Monitorar propagação
./scripts/monitor-dns.sh

# Ou verificar manualmente
nslookup irisregistro.qzz.io
```

### 2. Adicionar Registro de Validação SSL
No painel DNS do provedor qzz.io, adicione:
```
Tipo: CNAME
Nome: _8fb35ebd0764d17fed3ed052aa1a6c7d.irisregistro.qzz.io
Valor: _2336bc864a675bab6bf1a609dd737472.jkddzztszm.acm-validations.aws
TTL: 300
```

### 3. Verificar Status do Certificado
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:026544697783:certificate/2ac37da9-62c8-4f9e-82d0-20d2798afc57 \
  --region us-east-1 \
  --profile guardia \
  --query "Certificate.Status"
```

### 4. Configurar HTTPS no ALB
Quando o certificado estiver com status "ISSUED":
```bash
./scripts/configure-alb-https.sh
```

### 5. Testar Aplicação
```bash
# HTTP (temporário)
curl -I http://irisregistro.qzz.io

# HTTPS (após configuração)
curl -I https://irisregistro.qzz.io
```

---

## 🔧 Comandos Úteis

### Verificar Status do ECS
```bash
aws ecs describe-services \
  --cluster guardia-cluster \
  --services guardia-service \
  --region us-east-1 \
  --profile guardia
```

### Ver Logs da Aplicação
```bash
aws logs tail /ecs/guardia-app --follow --region us-east-1 --profile guardia
```

### Fazer Deploy
```bash
./scripts/deploy-aws.sh
```

---

## 📊 Recursos AWS

| Recurso | ID/ARN | Status |
|---------|--------|--------|
| ECS Cluster | guardia-cluster | ✅ Online |
| ECS Service | guardia-service | ✅ Running |
| ALB | guardia-alb-1653604039.us-east-1.elb.amazonaws.com | ✅ Active |
| Target Group | guardia-tg | ✅ Healthy |
| RDS PostgreSQL | guardia-db.catawsu2siuo.us-east-1.rds.amazonaws.com | ✅ Available |
| MongoDB Atlas | guardia.oxncauv.mongodb.net | ✅ Connected |
| Cognito User Pool | us-east-1_iwU4xEMtV | ✅ Active |
| S3 Bucket | guardia-uploads-us-east-1 | ✅ Created |
| ACM Certificate | 2ac37da9-62c8-4f9e-82d0-20d2798afc57 | ⏳ Pending Validation |

---

## 🌐 URLs

- **Produção (após DNS)**: https://irisregistro.qzz.io
- **ALB Direto**: http://guardia-alb-1653604039.us-east-1.elb.amazonaws.com
- **IP Público**: http://44.204.117.169:3000

---

## 📝 Credenciais

Todas as credenciais estão armazenadas em `.env` (não commitado no Git).

Para visualizar:
```bash
cat .env
```

---

## 🆘 Troubleshooting

### DNS não resolve
- Verifique se o registro CNAME foi adicionado corretamente
- Aguarde até 48h para propagação completa (geralmente 5-30 min)
- Use `nslookup irisregistro.qzz.io` para verificar

### Certificado SSL não valida
- Verifique se o registro de validação DNS foi adicionado
- Aguarde 5-30 minutos após adicionar o registro
- Verifique status: `aws acm describe-certificate --certificate-arn <ARN>`

### Aplicação não responde
- Verifique logs: `aws logs tail /ecs/guardia-app --follow`
- Verifique status do ECS: `aws ecs describe-services --cluster guardia-cluster --services guardia-service`
- Verifique health do target group no console AWS

---

**Última atualização**: 2026-04-09 10:30 UTC