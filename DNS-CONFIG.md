# Configuração DNS para irisregistro.qzz.io

## Informações do ALB (Application Load Balancer)

- **DNS do ALB**: `guardia-alb-1653604039.us-east-1.elb.amazonaws.com`
- **Hosted Zone ID**: `Z35SXDOTRQ7X7K` (us-east-1)

## Configuração no Provedor DNS (qzz.io)

Acesse o painel de controle do seu provedor DNS onde o domínio `qzz.io` está registrado e adicione o seguinte registro:

### Opção 1: CNAME (Recomendado para subdomínios)

```
Tipo: CNAME
Nome: irisregistro
Valor: guardia-alb-1653604039.us-east-1.elb.amazonaws.com
TTL: 300 (5 minutos)
```

### Opção 2: A Record (Se o provedor suportar ALIAS)

Se seu provedor DNS suportar registros ALIAS (como Route 53), use:

```
Tipo: A (ALIAS)
Nome: irisregistro
Valor: guardia-alb-1653604039.us-east-1.elb.amazonaws.com
TTL: 300
```

## Verificação

Após configurar o DNS, aguarde a propagação (5-30 minutos) e teste:

```bash
# Verificar resolução DNS
nslookup irisregistro.qzz.io

# Testar conectividade
curl -I http://irisregistro.qzz.io
```

## Certificado SSL (HTTPS)

Para habilitar HTTPS, você precisa:

1. Solicitar um certificado SSL no AWS Certificate Manager (ACM)
2. Validar o domínio via DNS ou email
3. Adicionar o certificado ao listener HTTPS (porta 443) do ALB

### Comandos para solicitar certificado:

```bash
# Solicitar certificado
aws acm request-certificate \
  --domain-name irisregistro.qzz.io \
  --validation-method DNS \
  --region us-east-1 \
  --profile guardia

# Obter informações de validação
aws acm describe-certificate \
  --certificate-arn <ARN_DO_CERTIFICADO> \
  --region us-east-1 \
  --profile guardia
```

Após obter o registro de validação DNS, adicione-o no seu provedor DNS:

```
Tipo: CNAME
Nome: _<hash>.irisregistro.qzz.io
Valor: _<hash>.acm-validations.aws
TTL: 300
```

## URLs do Projeto

- **Produção**: https://irisregistro.qzz.io
- **ALB Direto**: http://guardia-alb-1653604039.us-east-1.elb.amazonaws.com
- **IP Público**: http://44.204.117.169:3000

## Status Atual

- ✅ ALB configurado e rodando
- ✅ ECS Service online
- ⏳ DNS aguardando configuração no provedor
- ⏳ Certificado SSL pendente

## Próximos Passos

1. Configurar o registro CNAME no provedor DNS de qzz.io
2. Solicitar certificado SSL no ACM
3. Adicionar certificado ao listener HTTPS do ALB
4. Redirecionar HTTP para HTTPS