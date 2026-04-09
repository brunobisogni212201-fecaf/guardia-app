#!/bin/bash

set -e

echo "🔒 Configurando SSL para irisregistro.qzz.io"
echo "============================================="

AWS_REGION="us-east-1"
DOMAIN="irisregistro.qzz.io"

# 1. Solicitar certificado SSL
echo ""
echo "1️⃣ Solicitando certificado SSL..."

CERT_ARN=$(aws acm request-certificate \
  --domain-name "$DOMAIN" \
  --validation-method DNS \
  --region $AWS_REGION \
  --profile guardia \
  --query "CertificateArn" \
  --output text)

echo "✅ Certificado solicitado: $CERT_ARN"

# 2. Aguardar e obter informações de validação
echo ""
echo "2️⃣ Obtendo informações de validação DNS..."
sleep 10

aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region $AWS_REGION \
  --profile guardia \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord" \
  --output table

echo ""
echo "============================================="
echo "📋 Próximos passos:"
echo ""
echo "1. Adicione o registro CNAME acima no seu provedor DNS (qzz.io)"
echo "2. Aguarde a validação do certificado (5-30 minutos)"
echo "3. Execute: aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION --profile guardia"
echo "4. Quando o status for 'ISSUED', execute scripts/configure-alb-https.sh"
echo ""
echo "Certificado ARN: $CERT_ARN"
echo "============================================="