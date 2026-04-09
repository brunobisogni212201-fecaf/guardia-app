#!/bin/bash

# Script para atualizar variáveis de ambiente no AWS App Runner
# Uso: ./scripts/update-env.sh

set -e

AWS_REGION="us-east-1"
APP_RUNNER_SERVICE="guardia-app-service"

echo "🔧 Atualizando variáveis de ambiente no App Runner..."

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
  echo "❌ Arquivo .env não encontrado!"
  exit 1
fi

# Ler variáveis do .env
source .env

# Obter ARN do serviço
SERVICE_ARN=$(aws apprunner list-services --region $AWS_REGION --query "ServiceSummaryList[?ServiceName=='${APP_RUNNER_SERVICE}'].ServiceArn" --output text)

if [ -z "$SERVICE_ARN" ]; then
  echo "❌ Serviço não encontrado!"
  exit 1
fi

echo "Serviço: $SERVICE_ARN"

# Atualizar variáveis de ambiente
aws apprunner update-service \
  --service-arn $SERVICE_ARN \
  --source-configuration "ImageRepository={ImageConfiguration={RuntimeEnvironmentVariables={\
NODE_ENV=production,\
DATABASE_URL=\"$DATABASE_URL\",\
GEMINI_API_KEY=\"$GEMINI_API_KEY\",\
GEMINI_MODEL=\"$GEMINI_MODEL\",\
AWS_ACCESS_KEY_ID=\"$AWS_ACCESS_KEY_ID\",\
AWS_SECRET_ACCESS_KEY=\"$AWS_SECRET_ACCESS_KEY\",\
AWS_REGION=\"$AWS_REGION\",\
NEXT_PUBLIC_COGNITO_CLIENT_ID=\"$NEXT_PUBLIC_COGNITO_CLIENT_ID\",\
NEXT_PUBLIC_COGNITO_USER_POOL_ID=\"$NEXT_PUBLIC_COGNITO_USER_POOL_ID\",\
COGNITO_CLIENT_SECRET=\"$COGNITO_CLIENT_SECRET\",\
S3_BUCKET=\"$S3_BUCKET\"}}}" \
  --region $AWS_REGION

echo "✅ Variáveis de ambiente atualizadas!"
echo "⏳ Aguarde o serviço reiniciar..."