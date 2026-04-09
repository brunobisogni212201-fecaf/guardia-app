#!/bin/bash

set -e

echo "🚀 Configurando SES para Envio de Emails"
echo "========================================="

AWS_REGION="us-east-1"
DOMAIN="guardia.app"
EMAIL_FROM="contato@$DOMAIN"

echo "Domain: $DOMAIN"
echo "Email From: $EMAIL_FROM"

# 1. Verificar domínio no SES
echo ""
echo "1️⃣ Verificando domínio no SES..."

SES_DOMAIN_STATUS=$(aws ses get-identity-verification-attributes \
  --identities "$DOMAIN" \
  --query "VerificationAttributes.$DOMAIN.VerificationStatus" \
  --output text \
  --region $AWS_REGION)

if [ "$SES_DOMAIN_STATUS" != "Success" ]; then
  echo "Domínio não verificado. Verificando..."
  
  aws ses verify-domain-identity --domain "$DOMAIN" --region $AWS_REGION
  
  echo "✅ Domínio verificado!"
  echo ""
  echo "📋 Registros DNS para adicionar no Route 53:"
  echo ""
  
  # Obter registros DKIM
  aws ses get-identity-dkim-attributes \
    --identities "$DOMAIN" \
    --query "DkimAttributes.$DOMAIN.DkimTokens" \
    --output text \
    --region $AWS_REGION | while read token; do
    echo "  Name: $token._domainkey.$DOMAIN"
    echo "  Type: TXT"
    echo "  Value: v=DKIM1; k=rsa; p=<chave>"
    echo ""
  done
  
  echo "  Name: $DOMAIN"
  echo "  Type: TXT"
  echo "  Value: v=spf1 include:amazonses.com ~all"
  echo ""
  
  echo "⚠️  Adicione estes registros no Route 53 e aguarde a propagação (5-10 minutos)"
  read -p "Pressione Enter quando os registros estiverem configurados..."
  
  # Aguardar verificação
  echo "Aguardando verificação..."
  sleep 30
else
  echo "✅ Domínio já verificado no SES"
fi

# 2. Verificar email de envio
echo ""
echo "2️⃣ Verificando email de envio..."

EMAIL_STATUS=$(aws ses get-identity-verification-attributes \
  --identities "$EMAIL_FROM" \
  --query "VerificationAttributes.$EMAIL_FROM.VerificationStatus" \
  --output text \
  --region $AWS_REGION)

if [ "$EMAIL_STATUS" != "Success" ]; then
  echo "Email não verificado. Verificando..."
  aws ses verify-email-identity --email-address "$EMAIL_FROM" --region $AWS_REGION
  echo "✅ Email verificado! (Verifique a caixa de entrada)"
else
  echo "✅ Email já verificado: $EMAIL_FROM"
fi

# 3. Criar IAM policy para SES
echo ""
echo "3️⃣ Criando IAM policy para SES..."

POLICY_ARN=$(aws iam list-policies --query "Policies[?PolicyName=='SES-Send-Email'].Arn" --output text --region $AWS_REGION)

if [ -z "$POLICY_ARN" ]; then
  aws iam create-policy \
    --policy-name SES-Send-Email \
    --policy-document '{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "ses:SendEmail",
            "ses:SendRawEmail",
            "ses:SendTemplatedEmail"
          ],
          "Resource": "*"
        }
      ]
    }' \
    --region $AWS_REGION
  echo "✅ Policy SES-Send-Email criada"
else
  echo "✅ Policy SES-Send-Email já existe"
fi

# 4. Criar usuário IAM para SES
echo ""
echo "4️⃣ Criando usuário IAM para SES..."

IAM_USER="guardia-ses-user"
USER_EXISTS=$(aws iam list-users --query "Users[?UserName=='$IAM_USER'].UserName" --output text --region $AWS_REGION)

if [ -z "$USER_EXISTS" ]; then
  aws iam create-user --user-name "$IAM_USER" --region $AWS_REGION
  echo "✅ Usuário IAM $IAM_USER criado"
  
  aws iam attach-user-policy \
    --user-name "$IAM_USER" \
    --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess \
    --region $AWS_REGION
  echo "✅ Policy AmazonSESFullAccess anexada"
else
  echo "✅ Usuário IAM $IAM_USER já existe"
fi

# 5. Criar SMTP credentials
echo ""
echo "5️⃣ Criando SMTP credentials..."

if [ -z "$USER_EXISTS" ]; then
  ACCESS_KEY=$(aws iam create-access-key --user-name "$IAM_USER" --query "AccessKey" --region $AWS_REGION)
  echo "✅ SMTP credentials criadas!"
  echo ""
  echo "📋 Credenciais SMTP (salve em lugar seguro):"
  echo "$ACCESS_KEY"
else
  echo "⚠️  Usuário já existe. Acesse o console IAM para gerar novas credenciais."
fi

# 6. Criar template de email
echo ""
echo "6️⃣ Criando template de email..."

aws ses create-template \
  --template '{
    "TemplateName": "GuardiaAnalysis",
    "SubjectPart": "Análise de Conversa - Guardiã",
    "TextPart": "Olá, sua análise de conversa está pronta. Acesse o aplicativo para ver os resultados.",
    "HtmlPart": "<h1>Análise de Conversa - Guardiã</h1><p>Olá,</p><p>Sua análise de conversa está pronta. Acesse o aplicativo para ver os resultados.</p>"
  }' \
  --region $AWS_REGION

echo "✅ Template 'GuardiaAnalysis' criado"

echo ""
echo "========================================="
echo "✅ Configuração SES concluída!"
echo ""
echo "📧 Configurações de SMTP:"
echo "   Servidor: smtp.us-east-1.amazonaws.com"
echo "   Porta: 587 (TLS)"
echo "   Usuário: [IAM_USER_ACCESS_KEY]"
echo "   Senha: [IAM_USER_SECRET_KEY]"
echo ""
echo "📧 Email de envio: $EMAIL_FROM"
echo ""
echo "💡 Use o comando abaixo para testar o envio:"
echo "aws ses send-email --from \"$EMAIL_FROM\" --destination file://dest.json --message file://message.json --region $AWS_REGION"