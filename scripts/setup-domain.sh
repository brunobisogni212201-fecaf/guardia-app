#!/bin/bash

set -e

echo "🚀 Configurando URL Fixa para Guardiã"
echo "====================================="

AWS_REGION="us-east-1"
DOMAIN="guardia.app"
SUBDOMAIN="app.guardia.app"
ALB_DNS="guardia-alb-1653604039.us-east-1.elb.amazonaws.com"

echo "ALB DNS: $ALB_DNS"
echo "Domain: $DOMAIN"
echo "Subdomain: $SUBDOMAIN"

# 1. Criar Hosted Zone no Route 53 (se não existir)
echo ""
echo "1️⃣ Verificando Hosted Zone..."

HOSTED_ZONE=$(aws route53 list-hosted-zones-by-name --dns-name "$DOMAIN" --query "HostedZones[0].Id" --output text --region $AWS_REGION)

if [ -z "$HOSTED_ZONE" ]; then
  echo "❌ Hosted Zone não encontrada para $DOMAIN"
  echo "💡 Crie uma Hosted Zone no console do Route 53 primeiro"
  exit 1
fi

echo "Hosted Zone encontrada: $HOSTED_ZONE"

# 2. Criar registro A no Route 53
echo ""
echo "2️⃣ Criando registro A no Route 53..."

# Criar arquivo de change batch
cat > /tmp/route53-change.json << EOF
{
  "Comment": "Create record for $SUBDOMAIN",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "$SUBDOMAIN",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF

# Aplicar mudança
aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE" \
  --change-batch file:///tmp/route53-change.json \
  --region $AWS_REGION

echo "✅ Registro A criado para $SUBDOMAIN -> $ALB_DNS"

# 3. Solicitar certificado SSL
echo ""
echo "3️⃣ Solicitando certificado SSL..."

CERT_ARN=$(aws acm request-certificate \
  --domain-name "$SUBDOMAIN" \
  --validation-method DNS \
  --query "CertificateArn" \
  --output text \
  --region $AWS_REGION)

echo "Certificado solicitado: $CERT_ARN"

# 4. Aguardar validação do certificado
echo ""
echo "4️⃣ Aguardando validação do certificado..."

sleep 60

# Verificar status do certificado
CERT_STATUS=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --query "Certificate.Status" --output text --region $AWS_REGION)

if [ "$CERT_STATUS" == "ISSUED" ]; then
  echo "✅ Certificado emitido!"
else
  echo "⚠️  Certificado em processo de validação. Aguarde alguns minutos e verifique o console do ACM."
fi

# 5. Configurar listener no ALB
echo ""
echo "5️⃣ Configurando listener HTTPS no ALB..."

# Obter ARN do ALB
ALB_ARN=$(aws elbv2 describe-load-balancers --name guardia-alb --query "LoadBalancers[0].LoadBalancerArn" --output text --region $AWS_REGION)

# Criar listener HTTPS
HTTPS_LISTENER=$(aws elbv2 create-listener \
  --load-balancer-arn "$ALB_ARN" \
  --protocol HTTPS \
  --port 443 \
  --ssl-policy ELBSecurityPolicy-2016-08 \
  --certificates CertificateArn="$CERT_ARN" \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:026544697783:targetgroup/guardia-tg/d3ec5168591f3aa4 \
  --query "Listeners[0].ListenerArn" \
  --output text \
  --region $AWS_REGION)

echo "✅ Listener HTTPS criado: $HTTPS_LISTENER"

# 6. Atualizar task definition com variáveis de ambiente
echo ""
echo "6️⃣ Atualizando task definition com variáveis de ambiente..."

# Obter task definition atual
aws ecs describe-task-definition --task-definition guardia-app:8 --query "taskDefinition" --region $AWS_REGION > /tmp/task-def.json

# Atualizar variáveis de ambiente
# (Este passo deve ser feito manualmente no console ou via CLI)

echo ""
echo "====================================="
echo "✅ Configuração concluída!"
echo ""
echo "🌐 URL Fixa: https://$SUBDOMAIN"
echo ""
echo "📋 Próximos passos:"
echo "1. Aguarde a propagação do DNS (5-10 minutos)"
echo "2. Acesse https://$SUBDOMAIN para testar"
echo "3. Configure o SES conforme scripts/setup-ses.sh"