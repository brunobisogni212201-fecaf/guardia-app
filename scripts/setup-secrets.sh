#!/bin/bash

set -e

echo "=== Criar Secrets no AWS Secrets Manager ==="

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)

# Nota: Substitua os valores abaixo pelos valores reais

# 1. Database URL
echo "=== 1. Criando secret DATABASE_URL ==="
aws secretsmanager create-secret \
  --name guardia-db-url \
  --description "Database connection string para Guardiã App" \
  --secret-string '{"DATABASE_URL":"postgres://user:password@host:5432/guardia"}' \
  --region ${AWS_REGION} 2>/dev/null || echo "Secret já existe, atualize manualmente via console"

# 2. Gemini API Key
echo "=== 2. Criando secret GEMINI_API_KEY ==="
aws secretsmanager create-secret \
  --name guardia-gemini-key \
  --description "API Key do Google Gemini" \
  --secret-string '{"GEMINI_API_KEY":"AIzaSy..."}' \
  --region ${AWS_REGION} 2>/dev/null || echo "Secret já existe"

# 3. AWS Credentials
echo "=== 3. Criando secret AWS Credentials ==="
aws secretsmanager create-secret \
  --name guardia-aws-creds \
  --description "Credenciais AWS para a aplicação" \
  --secret-string '{"access_key_id":"AKIAQMLRP6G3T3VDU66D","secret_access_key":"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"}' \
  --region ${AWS_REGION} 2>/dev/null || echo "Secret já existe"

echo "=== Secrets criados! ==="