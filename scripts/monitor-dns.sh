#!/bin/bash

echo "🔍 Monitorando propagação DNS para irisregistro.qzz.io"
echo "======================================================"

DOMAIN="irisregistro.qzz.io"
EXPECTED_TARGET="guardia-alb-1653604039.us-east-1.elb.amazonaws.com"
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  
  echo ""
  echo "Tentativa $ATTEMPT/$MAX_ATTEMPTS..."
  
  # Verificar DNS
  DNS_RESULT=$(nslookup $DOMAIN 2>&1 | grep -A 1 "Name:" | tail -1 | awk '{print $2}')
  
  if [ -n "$DNS_RESULT" ]; then
    echo "✅ DNS resolvido: $DNS_RESULT"
    
    # Verificar se aponta para o ALB
    if echo "$DNS_RESULT" | grep -q "elb.amazonaws.com"; then
      echo "✅ DNS aponta para o ALB correto!"
      echo ""
      echo "🎉 Propagação DNS concluída!"
      echo ""
      echo "Próximos passos:"
      echo "1. Adicione o registro de validação SSL no DNS"
      echo "2. Aguarde validação do certificado (5-30 min)"
      echo "3. Execute: ./scripts/configure-alb-https.sh"
      exit 0
    fi
  else
    echo "⏳ DNS ainda não propagado..."
  fi
  
  # Aguardar 30 segundos antes da próxima tentativa
  sleep 30
done

echo ""
echo "⚠️  Timeout: DNS não propagou após $MAX_ATTEMPTS tentativas"
echo "Verifique a configuração DNS no provedor"