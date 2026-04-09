#!/bin/bash
# ============================================
# Script para configurar GitHub Secrets para CI/CD
# ============================================

set -e

GH_REPO="brunobisogni212201-fecaf/guardia-app"

echo "🔐 Configurando GitHub Secrets para CI/CD"
echo "=========================================="

# Verificar se gh cli está instalado
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI não está instalado."
    echo "   Instale com: brew install gh"
    echo "   Ou configure manualmente no GitHub > Settings > Secrets"
    exit 1
fi

echo ""
echo "1️⃣ Verificando autenticação..."
gh auth status || gh auth login

echo ""
echo "2️⃣ Configurando AWS Secrets..."

# AWS credentials
echo "   Insira o AWS_ACCESS_KEY_ID:"
read -r AWS_ACCESS_KEY_ID
gh secret set AWS_ACCESS_KEY_ID --body "$AWS_ACCESS_KEY_ID" --repo "$GH_REPO"

echo "   Insira o AWS_SECRET_ACCESS_KEY:"
read -r AWS_SECRET_ACCESS_KEY
gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET_ACCESS_KEY" --repo "$GH_REPO"

echo "   Insira o AWS_ACCOUNT_ID:"
read -r AWS_ACCOUNT_ID
gh secret set AWS_ACCOUNT_ID --body "$AWS_ACCOUNT_ID" --repo "$GH_REPO"

echo ""
echo "3️⃣ Configurando Database..."
echo "   Insira a DATABASE_URL:"
read -r DATABASE_URL
gh secret set DATABASE_URL --body "$DATABASE_URL" --repo "$GH_REPO"

echo ""
echo "4️⃣ Configurando Auth0..."
echo "   Insira o AUTH0_DOMAIN:"
read -r AUTH0_DOMAIN
gh secret set AUTH0_DOMAIN --body "$AUTH0_DOMAIN" --repo "$GH_REPO"

echo "   Insira o AUTH0_CLIENT_ID:"
read -r AUTH0_CLIENT_ID
gh secret set AUTH0_CLIENT_ID --body "$AUTH0_CLIENT_ID" --repo "$GH_REPO"

echo "   Insira o AUTH0_CLIENT_SECRET:"
read -r AUTH0_CLIENT_SECRET
gh secret set AUTH0_CLIENT_SECRET --body "$AUTH0_CLIENT_SECRET" --repo "$GH_REPO"

echo ""
echo "5️⃣ Configurando APIs..."
echo "   Insira o GEMINI_API_KEY:"
read -r GEMINI_API_KEY
gh secret set GEMINI_API_KEY --body "$GEMINI_API_KEY" --repo "$GH_REPO"

echo "   Insira o APICPF_API_KEY:"
read -r APICPF_API_KEY
gh secret set APICPF_API_KEY --body "$APICPF_API_KEY" --repo "$GH_REPO"

echo "   Insira o DATAJUD_API_KEY:"
read -r DATAJUD_API_KEY
gh secret set DATAJUD_API_KEY --body "$DATAJUD_API_KEY" --repo "$GH_REPO"

echo ""
echo "6️⃣ Configurando SES (Email)..."
echo "   Insira o SES_SMTP_HOST:"
read -r SES_SMTP_HOST
gh secret set SES_SMTP_HOST --body "$SES_SMTP_HOST" --repo "$GH_REPO"

echo "   Insira o SES_FROM_EMAIL:"
read -r SES_FROM_EMAIL
gh secret set SES_FROM_EMAIL --body "$SES_FROM_EMAIL" --repo "$GH_REPO"

echo ""
echo "7️⃣ Configurando URLs..."
echo "   Insira o APP_URL:"
read -r APP_URL
gh secret set APP_URL --body "$APP_URL" --repo "$GH_REPO"

echo "   Insira o ECS_SERVICE_PROD:"
read -r ECS_SERVICE_PROD
gh secret set ECS_SERVICE_PROD --body "$ECS_SERVICE_PROD" --repo "$GH_REPO"

echo ""
echo "=========================================="
echo "✅ Todos os secrets configurados!"
echo ""
echo "📋 Secrets configurados:"
gh secret list --repo "$GH_REPO"
echo ""
echo "💡 Para adicionar AWS Secrets Manager ARNs (opcional):"
echo "   gh secret set AUTH0_DOMAIN_ARN --body 'arn:aws:secretsmanager:...'"
echo "=========================================="
