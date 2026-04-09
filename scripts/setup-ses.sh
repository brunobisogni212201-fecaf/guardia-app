#!/bin/bash
# ============================================
# Script para configurar AWS SES - Email Transacional
# Para Íris - Plataforma de Proteção à Mulher
# ============================================

set -e

AWS_REGION="us-east-1"
DOMAIN="irisregistro.qzz.io"
SENDER_EMAIL="contato@$DOMAIN"

echo "📧 Configurando AWS SES - Íris Email Transacional"
echo "=================================================="

# 1. Verificar status do domínio
echo ""
echo "1️⃣ Verificando domínio no SES..."
VERIFIED=$(aws ses get-identity-verification-attributes \
  --identities "$DOMAIN" \
  --query "VerificationAttributes.$DOMAIN.VerificationStatus" \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "not_found")

if [ "$VERIFIED" = "Success" ]; then
  echo "✅ Domínio $DOMAIN já verificado"
else
  echo "🔄 Verificando domínio..."
  aws ses verify-domain-identity --domain "$DOMAIN" --region $AWS_REGION
  echo "✅ Solicitação de verificação enviada!"
  echo ""
  echo "📋 Adicione os seguintes registros DNS no Route 53:"
  DKIM_TOKENS=$(aws ses get-identity-dkim-attributes \
    --identities "$DOMAIN" \
    --query "DkimAttributes.$DOMAIN.DkimTokens" \
    --output text \
    --region $AWS_REGION)
  
  for token in $DKIM_TOKENS; do
    echo "  Type: CNAME"
    echo "  Name: ${token}._domainkey.$DOMAIN"
    echo "  Value: ${token}.dkim.amazonses.com"
    echo ""
  done
  
  echo "  Type: TXT"
  echo "  Name: $DOMAIN"
  echo "  Value: v=spf1 include:amazonses.com ~all"
  echo ""
fi

# 2. Verificar email de envio
echo ""
echo "2️⃣ Verificando email de envio..."
EMAIL_STATUS=$(aws ses get-identity-verification-attributes \
  --identities "$SENDER_EMAIL" \
  --query "VerificationAttributes.$SENDER_EMAIL.VerificationStatus" \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "not_found")

if [ "$EMAIL_STATUS" = "Success" ]; then
  echo "✅ Email $SENDER_EMAIL já verificado"
elif [ "$EMAIL_STATUS" = "not_found" ]; then
  echo "🔄 Solicitando verificação do email..."
  aws ses verify-email-identity --email-address "$SENDER_EMAIL" --region $AWS_REGION
  echo "✅ Verifique seu email para confirmar!"
else
  echo "⏳ Email pendente de verificação"
fi

# 3. Criar Configuration Set
echo ""
echo "3️⃣ Criando Configuration Set..."
aws ses create-configuration-set \
  --configuration-set '{
    "Name": "iris-prod",
    "TrackingOptions": {
      "CustomRedirectDomain": "track.irisregistro.qzz.io"
    }
  }' \
  --region $AWS_REGION 2>/dev/null && echo "✅ Configuration Set 'iris-prod' criado" || echo "ℹ️ Configuration Set já existe"

# 4. Configurar SNS para bounces e complaints
echo ""
echo "4️⃣ Configurando SNS para notificações de bounce/complaint..."

# Criar SNS topic se não existir
TOPIC_ARN=$(aws sns create-topic \
  --name iris-ses-notifications \
  --region $AWS_REGION \
  --query 'TopicArn' \
  --output text 2>/dev/null || aws sns list-topics --query 'Topics[?contains(TopicArn, "iris-ses")].TopicArn' --output text --region $AWS_REGION)

if [ -n "$TOPIC_ARN" ]; then
  echo "✅ SNS Topic: $TOPIC_ARN"
  
  # Configurar SES para usar SNS
  aws ses set-configuration-set-tracking-options \
    --configuration-set-name iris-prod \
    --tracking-options '{"CustomRedirectDomain": "track.irisregistro.qzz.io"}' \
    --region $AWS_REGION 2>/dev/null || true
else
  echo "ℹ️ SNS Topic já configurado"
fi

# 5. Criar Email Templates
echo ""
echo "5️⃣ Criando templates de email..."

# Template: Análise completa
aws ses create-template \
  --template '{
    "TemplateName": "IrisAnaliseCompleta",
    "SubjectPart": "Sua análise está pronta - Íris",
    "TextPart": "Olá,\n\nSua análise de conversa foi concluída.\n\nAcesse o Íris para ver os insights e recomendações.\n\nSua segurança é nossa prioridade.\n\nEquipe Íris",
    "HtmlPart": "<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;background:#0f172a;color:#f8fafc;padding:40px;}.card{background:#1e293b;border-radius:16px;padding:32px;max-width:500px;margin:0 auto;}.btn{background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;}.footer{text-align:center;margin-top:24px;font-size:12px;color:#64748b;}</style></head><body><div class=\"card\"><h1 style=\"color:#f97316\">Íris</h1><p>Olá,</p><p>Sua análise de conversa foi concluída com sucesso.</p><p>Acesse o aplicativo para ver os insights e recomendações personalizadas.</p><a href=\"https://irisregistro.qzz.io\" class=\"btn\">Ver Análise</a></div><div class=\"footer\"><p>Sua privacidade é garantida. Não compartilhamos seus dados.</p></div></body></html>"
  }' \
  --region $AWS_REGION 2>/dev/null && echo "✅ Template 'IrisAnaliseCompleta' criado" || echo "ℹ️ Template já existe"

# Template: Alerta de risco alto
aws ses create-template \
  --template '{
    "TemplateName": "IrisAlertaRisco",
    "SubjectPart": "⚠️ Alerta de Segurança - Íris",
    "TextPart": "Olá,\n\nDetectamos indicadores de risco elevado na última análise.\n\nRecomendamos:\n1. Salvar evidências imediatamente\n2. Contatar redes de apoio\n3. Ligar para 180 (Central de Atendimento à Mulher)\n\nNão ignore estes sinais. Você não está sozinha.\n\nEquipe Íris",
    "HtmlPart": "<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;background:#0f172a;color:#f8fafc;padding:40px;}.card{background:#1e293b;border-radius:16px;padding:32px;max-width:500px;margin:0 auto;border-left:4px solid #ef4444;}.alert{background:#ef4444/10;border-radius:8px;padding:16px;margin:16px 0;}.btn{background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:8px;}.helpline{background:#22c55e/10;border-radius:8px;padding:16px;margin-top:16px;}.footer{text-align:center;margin-top:24px;font-size:12px;color:#64748b;}</style></head><body><div class=\"card\"><h1 style=\"color:#f97316\">Íris</h1><div class=\"alert\"><strong>⚠️ Alerta de Segurança</strong></div><p>Detectamos indicadores de risco elevado na última análise.</p><p><strong>Recomendamos:</strong></p><ul><li>Salvar evidências imediatamente</li><li>Contatar redes de apoio</li><li>Ligar para <strong>180</strong> - Central de Atendimento à Mulher</li></ul><div class=\"helpline\"><strong>🌟 Você não está sozinha</strong><br>Ligue 180 para apoio gratuito e sigiloso</div><a href=\"https://irisregistro.qzz.io/evidence\" class=\"btn\">Salvar Evidências</a></div><div class=\"footer\"><p>Sua segurança é nossa prioridade</p></div></body></html>"
  }' \
  --region $AWS_REGION 2>/dev/null && echo "✅ Template 'IrisAlertaRisco' criado" || echo "ℹ️ Template já existe"

# Template: Boas-vindas
aws ses create-template \
  --template '{
    "TemplateName": "IrisBemVinda",
    "SubjectPart": "Bem-vinda ao Íris - Sua segurança é nossa prioridade",
    "TextPart": "Olá,\n\nSeja muito bem-vinda ao Íris!\n\nVocê agora faz parte de uma comunidade de mulheres que valorizam sua segurança e bem-estar.\n\nRecursos disponíveis:\n• Análise de conversas\n• Registro seguro de evidências\n• Busca preventiva\n• Rede de apoio\n\nEstamos aqui para você.\n\nEquipe Íris",
    "HtmlPart": "<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;background:#0f172a;color:#f8fafc;padding:40px;}.card{background:#1e293b;border-radius:16px;padding:32px;max-width:500px;margin:0 auto;}.feature{background:#0f172a;padding:12px;border-radius:8px;margin:8px 0;}.btn{background:#f97316;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;}.footer{text-align:center;margin-top:24px;font-size:12px;color:#64748b;}</style></head><body><div class=\"card\"><h1 style=\"color:#f97316\">Bem-vinda ao Íris!</h1><p>Você agora faz parte de uma comunidade que valoriza sua segurança.</p><div class=\"feature\">📊 Análise de conversas com IA</div><div class=\"feature\">🔒 Registro seguro de evidências</div><div class=\"feature\">🔍 Busca preventiva</div><div class=\"feature\">💜 Rede de apoio</div><p>Estamos aqui para você.</p><a href=\"https://irisregistro.qzz.io/dashboard\" class=\"btn\">Acessar Dashboard</a></div><div class=\"footer\"><p>Sua privacidade é garantida. Seus dados são criptografados.</p></div></body></html>"
  }' \
  --region $AWS_REGION 2>/dev/null && echo "✅ Template 'IrisBemVinda' criado" || echo "ℹ️ Template já existe"

# 6. Listar Configuration Sets
echo ""
echo "6️⃣ Configuration Sets configurados:"
aws ses list-configuration-sets --region $AWS_REGION --query 'ConfigurationSetNames' --output table 2>/dev/null || echo "Nenhum"

echo ""
echo "=================================================="
echo "✅ Configuração SES concluída!"
echo ""
echo "📧 Configurações de SMTP:"
echo "   Servidor: email-smtp.$AWS_REGION.amazonaws.com"
echo "   Porta: 587 (STARTTLS) ou 465 (SMTPS)"
echo "   Usuário: Access Key IAM com policy SES"
echo "   Senha: Secret Key IAM"
echo ""
echo "📧 Email de envio: $SENDER_EMAIL"
echo ""
echo "📋 Para obter SMTP credentials:"
echo "   1. AWS Console > IAM > Users"
echo "   2. Crie usuário com policy AmazonSESFullAccess"
echo "   3. AWS Console > SES > SMTP settings > Create SMTP credentials"
echo ""
echo "⚠️ IMPORTANTE: Solicite saída do sandbox SES em:"
echo "   https://console.aws.amazon.com/ses/home?region=$AWS_REGION#/account"
echo "=================================================="
