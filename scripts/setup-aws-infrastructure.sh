#!/bin/bash

set -e

echo "🚀 Configurando Infraestrutura AWS para Guardiã"
echo "================================================"

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
DOMAIN="guardia.app"
SUBDOMAIN="app.guardia.app"

echo "Account ID: $AWS_ACCOUNT_ID"
echo "Domain: $DOMAIN"
echo "Subdomain: $SUBDOMAIN"

# 1. Configurar domínio fixo com Route 53
echo ""
echo "1️⃣ Configurando domínio fixo com Route 53..."

# Criar hosted zone (se não existir)
HOSTED_ZONE=$(aws route53 list-hosted-zones-by-name --dns-name "$DOMAIN" --query "HostedZones[0].Id" --output text)

if [ -z "$HOSTED_ZONE" ]; then
  echo "Criando Hosted Zone para $DOMAIN..."
  HOSTED_ZONE=$(aws route53 create-hosted-zone --name "$DOMAIN" --caller-reference "$(date +%s)" --query "HostedZone.Id" --output text)
  echo "Hosted Zone criada: $HOSTED_ZONE"
else
  echo "Hosted Zone já existe: $HOSTED_ZONE"
fi

# 2. Configurar ALB com domínio personalizado
echo ""
echo "2️⃣ Configurando ALB com domínio personalizado..."

# Criar certificado SSL no ACM
CERT_ARN=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='$SUBDOMAIN'].CertificateArn" --output text)

if [ -z "$CERT_ARN" ]; then
  echo "Criando certificado SSL para $SUBDOMAIN..."
  CERT_ARN=$(aws acm request-certificate \
    --domain-name "$SUBDOMAIN" \
    --validation-method DNS \
    --query "CertificateArn" \
    --output text)
  echo "Certificado solicitado: $CERT_ARN"
  
  # Aguardar validação (pode levar alguns minutos)
  echo "Aguardando validação do certificado..."
  sleep 30
else
  echo "Certificado já existe: $CERT_ARN"
fi

# 3. Configurar SES para envio de emails
echo ""
echo "3️⃣ Configurando SES para envio de emails..."

# Verificar se o domínio já está verificado no SES
SES_DOMAIN_STATUS=$(aws ses get-identity-verification-attributes --identities "$DOMAIN" --query "VerificationAttributes.$DOMAIN.VerificationStatus" --output text)

if [ "$SES_DOMAIN_STATUS" != "Success" ]; then
  echo "Verificando domínio $DOMAIN no SES..."
  aws ses verify-domain-identity --domain "$DOMAIN" --region $AWS_REGION
  
  # Obter registros DNS para validação
  echo "Registros DNS para validação do domínio no SES:"
  aws ses get-identity-dkim-attributes --identities "$DOMAIN" --query "DkimAttributes.$DOMAIN.DkimVerificationToken"
  
  echo ""
  echo "⚠️  IMPORTANTE: Adicione os registros DNS no Route 53 para verificar o domínio no SES"
  echo "Após adicionar os registros, pressione Enter para continuar..."
  read -p "Pressione Enter quando os registros estiverem configurados..."
  
  # Aguardar verificação
  echo "Aguardando verificação do domínio..."
  sleep 30
else
  echo "Domínio já verificado no SES: $DOMAIN"
fi

# Criar SMTP credentials para o SES
echo ""
echo "4️⃣ Criando SMTP credentials para SES..."

# Criar IAM policy para SES
POLICY_ARN=$(aws iam list-policies --query "Policies[?PolicyName=='SES-SMTP-Access'].Arn" --output text)

if [ -z "$POLICY_ARN" ]; then
  aws iam create-policy \
    --policy-name SES-SMTP-Access \
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
    }'
  echo "Policy SES-SMTP-Access criada"
else
  echo "Policy SES-SMTP-Access já existe"
fi

# Criar usuário IAM para SES
IAM_USER="guardia-ses-user"
USER_EXISTS=$(aws iam list-users --query "Users[?UserName=='$IAM_USER'].UserName" --output text)

if [ -z "$USER_EXISTS" ]; then
  aws iam create-user --user-name "$IAM_USER"
  echo "Usuário IAM $IAM_USER criado"
  
  aws iam attach-user-policy \
    --user-name "$IAM_USER" \
    --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess
  
  # Criar access keys
  aws iam create-access-key --user-name "$IAM_USER" --query "AccessKey"
else
  echo "Usuário IAM $IAM_USER já existe"
fi

echo ""
echo "================================================"
echo "✅ Configuração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Adicione os registros DNS no Route 53 para o domínio $DOMAIN"
echo "2. Configure o certificado SSL no ALB"
echo "3. Atualize as variáveis de ambiente com as credenciais do SES"
echo ""
echo "SES SMTP Credentials (salve em lugar seguro):"
echo "   SMTP Username: [IAM_USER_ACCESS_KEY]"
echo "   SMTP Password: [IAM_USER_SECRET_KEY]"
echo ""
echo "Endpoint SES: smtp.us-east-1.amazonaws.com"
echo "Porta SMTP: 587 (TLS) ou 25/465 (SSL)"