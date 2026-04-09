#!/bin/bash

echo "🚀 Configurando .env para Guardiã"
echo "=================================="

# Criar .env se não existir
if [ ! -f .env ]; then
  echo "Criando .env a partir do .env.example..."
  cp .env.example .env
  echo "✅ .env criado!"
else
  echo "⚠️  .env já existe. Deseja sobrescrever? (N/n para cancelar)"
  read -r response
  if [[ ! "$response" =~ ^[Nn]$ ]]; then
    echo "Sobrescrevendo .env..."
    cp .env.example .env
  fi
fi

echo ""
echo "📝 Preencha as credenciais no arquivo .env:"
echo "   - MongoDB Atlas URI"
echo "   - Google Gemini API Key"
echo "   - AWS Access Key ID"
echo "   - AWS Secret Access Key"
echo "   - RDS Database URL"
echo "   - Cognito Credentials"
echo "   - SES Credentials"
echo ""
echo "💡 Use o script scripts/deploy-aws.sh após preencher as credenciais"