#!/bin/bash

set -e

echo "🔒 Configurando HTTPS no ALB"
echo "============================"

AWS_REGION="us-east-1"
CERT_ARN="arn:aws:acm:us-east-1:026544697783:certificate/2ac37da9-62c8-4f9e-82d0-20d2798afc57"
ALB_ARN="arn:aws:elasticloadbalancing:us-east-1:026544697783:loadbalancer/app/guardia-alb/31e00d5cb92611f5"
TARGET_GROUP_ARN="arn:aws:elasticloadbalancing:us-east-1:026544697783:targetgroup/guardia-tg/d3ec5168591f3aa4"

# 1. Verificar status do certificado
echo ""
echo "1️⃣ Verificando status do certificado..."

CERT_STATUS=$(aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region $AWS_REGION \
  --profile guardia \
  --query "Certificate.Status" \
  --output text)

echo "Status do certificado: $CERT_STATUS"

if [ "$CERT_STATUS" != "ISSUED" ]; then
  echo "❌ Certificado ainda não foi emitido. Status: $CERT_STATUS"
  echo "Aguarde a validação DNS e tente novamente."
  exit 1
fi

echo "✅ Certificado emitido!"

# 2. Verificar se já existe listener HTTPS
echo ""
echo "2️⃣ Verificando listeners existentes..."

HTTPS_LISTENER=$(aws elbv2 describe-listeners \
  --load-balancer-arn "$ALB_ARN" \
  --region $AWS_REGION \
  --profile guardia \
  --query "Listeners[?Port==\`443\`].ListenerArn" \
  --output text)

if [ -n "$HTTPS_LISTENER" ]; then
  echo "⚠️  Listener HTTPS já existe: $HTTPS_LISTENER"
  echo "Atualizando certificado..."
  
  aws elbv2 modify-listener \
    --listener-arn "$HTTPS_LISTENER" \
    --certificates CertificateArn="$CERT_ARN" \
    --region $AWS_REGION \
    --profile guardia
  
  echo "✅ Certificado atualizado!"
else
  echo "Criando novo listener HTTPS..."
  
  HTTPS_LISTENER=$(aws elbv2 create-listener \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn="$CERT_ARN" \
    --default-actions Type=forward,TargetGroupArn="$TARGET_GROUP_ARN" \
    --region $AWS_REGION \
    --profile guardia \
    --query "Listeners[0].ListenerArn" \
    --output text)
  
  echo "✅ Listener HTTPS criado: $HTTPS_LISTENER"
fi

# 3. Configurar redirecionamento HTTP -> HTTPS
echo ""
echo "3️⃣ Configurando redirecionamento HTTP -> HTTPS..."

HTTP_LISTENER=$(aws elbv2 describe-listeners \
  --load-balancer-arn "$ALB_ARN" \
  --region $AWS_REGION \
  --profile guardia \
  --query "Listeners[?Port==\`80\`].ListenerArn" \
  --output text)

if [ -n "$HTTP_LISTENER" ]; then
  aws elbv2 modify-listener \
    --listener-arn "$HTTP_LISTENER" \
    --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
    --region $AWS_REGION \
    --profile guardia
  
  echo "✅ Redirecionamento HTTP -> HTTPS configurado!"
else
  echo "⚠️  Listener HTTP não encontrado"
fi

# 4. Verificar configuração
echo ""
echo "4️⃣ Verificando configuração..."

aws elbv2 describe-listeners \
  --load-balancer-arn "$ALB_ARN" \
  --region $AWS_REGION \
  --profile guardia \
  --query "Listeners[*].[Port,Protocol,DefaultActions[0].Type]" \
  --output table

echo ""
echo "============================"
echo "✅ HTTPS configurado com sucesso!"
echo ""
echo "🌐 URL: https://irisregistro.qzz.io"
echo ""
echo "Teste a conexão:"
echo "  curl -I https://irisregistro.qzz.io"
echo "============================"