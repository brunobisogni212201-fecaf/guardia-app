#!/bin/bash
# ============================================
# Script para configurar Auth0 via API
# Correção de Callback URLs e OAuth
# ============================================

set -e

# Auth0 Configuration
AUTH0_DOMAIN="guardial-app.us.auth0.com"
AUTH0_CLIENT_ID="vF9Vtuj0vpQbqlrVX5dqIAYct6wJnOyc"
AUTH0_CLIENT_SECRET="_ffncgyBVLTIjtYQ_9oKaSYWRZEmQYVGtsXRRek7e7Og1_sbL9f4o9J6zdduCRnE"
APP_URL="https://irisregistro.qzz.io"
STAGING_URL="https://staging.irisregistro.qzz.io"

echo "🔐 Configurando Auth0 via API"
echo "================================"

# 1. Obter Access Token para Management API
echo ""
echo "1️⃣ Obtendo Access Token..."

TOKEN_RESPONSE=$(curl -s -X POST "https://${AUTH0_DOMAIN}/oauth/token" \
  -H "Content-Type: application/json" \
  -d "{
    \"client_id\": \"${AUTH0_CLIENT_ID}\",
    \"client_secret\": \"${AUTH0_CLIENT_SECRET}\",
    \"audience\": \"https://${AUTH0_DOMAIN}/api/v2/\",
    \"grant_type\": \"client_credentials\"
  }")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Erro ao obter token. Verifique as credenciais."
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo "✅ Access Token obtido"

# 2. Listar aplicações existentes
echo ""
echo "2️⃣ Listando aplicações..."

CLIENTS=$(curl -s -X GET "https://${AUTH0_DOMAIN}/api/v2/clients" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Aplicações encontradas:"
echo "$CLIENTS" | jq -r '.[].name'

# 3. Atualizar aplicação principal
echo ""
echo "3️⃣ Atualizando aplicação principal..."

CLIENT_ID=$(echo "$CLIENTS" | jq -r '.[] | select(.name == "guardia-app") | .client_id')

if [ -z "$CLIENT_ID" ] || [ "$CLIENT_ID" = "null" ]; then
  # Pegar primeira aplicação
  CLIENT_ID=$(echo "$CLIENTS" | jq -r '.[0].client_id')
  echo "Usando primeira aplicação: $CLIENT_ID"
fi

# Callback URLs corretas
CALLBACK_URLS="https://${APP_URL}/api/auth/callback,https://${APP_URL}/api/auth/callback/google,https://${STAGING_URL}/api/auth/callback,https://${STAGING_URL}/api/auth/callback/google,http://localhost:3000/api/auth/callback"

# Logout URLs corretas
LOGOUT_URLS="https://${APP_URL},https://${STAGING_URL},http://localhost:3000"

# Web Origins
WEB_ORIGINS="https://${APP_URL},https://${STAGING_URL},http://localhost:3000"

# Atualizar aplicação
echo ""
echo "4️⃣ Aplicando configurações..."

UPDATE_RESPONSE=$(curl -s -X PATCH "https://${AUTH0_DOMAIN}/api/v2/clients/${CLIENT_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"callbacks\": [$(echo "$CALLBACK_URLS" | jq -R -s -c 'split(",") | .[]' | jq -s 'map({url: .})' | jq -c '.[]' | jq -s 'map({url: .url})')],
    \"allowed_origins\": [$(echo "$WEB_ORIGINS" | tr ',' '\n' | jq -R -s '.')],
    \"allowed_logout_urls\": [$(echo "$LOGOUT_URLS" | tr ',' '\n' | jq -R -s '.')],
    \"web_origins\": [$(echo "$WEB_ORIGINS" | tr ',' '\n' | jq -R -s '.')],
    \"allowed_clients\": [],
    \"allowed_apps_apis\": [],
    \"grant_types\": [\"authorization_code\", \"implicit\", \"refresh_token\", \"client_credentials\", \"password\", \"http://auth0.com/oauth/grant-type/password-realm\", \"http://auth0.com/oauth/grant-type/mfa-otp\", \"http://auth0.com/connections/passwordless\"],
    \"oidc_conformant\": true,
    \"sso\": false
  }")

echo "Response: $UPDATE_RESPONSE"

# 4. Configurar Application Metadata
echo ""
echo "5️⃣ Configurando metadata da aplicação..."

METADATA_RESPONSE=$(curl -s -X PATCH "https://${AUTH0_DOMAIN}/api/v2/clients/${CLIENT_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "app_type": "spa",
    "token_endpoint_auth_method": "none",
    "refresh_token": {
      "rotation_type": "non-rotating",
      "expiration_type": "non-expiring"
    }
  }')

echo "✅ Metadata atualizada"

# 5. Criar conexão Google (se não existir)
echo ""
echo "6️⃣ Verificando conexões sociais..."

CONNECTIONS=$(curl -s -X GET "https://${AUTH0_DOMAIN}/api/v2/connections" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

GOOGLE_CONN=$(echo "$CONNECTIONS" | jq -r '.[] | select(.strategy == "google-oauth2") | .id')

if [ -z "$GOOGLE_CONN" ] || [ "$GOOGLE_CONN" = "null" ]; then
  echo "⚠️ Conexão Google não encontrada. Configure manualmente no Auth0 Dashboard."
else
  echo "✅ Conexão Google encontrada: $GOOGLE_CONN"
fi

# 7. Atualizar configuração da conexão Google
echo ""
echo "7️⃣ Verificando configuração Google OAuth..."

# Obter client_metadata
echo "$CLIENTS" | jq ".[] | select(.client_id == \"$CLIENT_ID\") | {name, callbacks, web_origins, allowed_logout_urls}"

# 8. Criar Database Connection (Username-Password-Authentication)
echo ""
echo "8️⃣ Verificando conexões de database..."

DBS=$(curl -s -X GET "https://${AUTH0_DOMAIN}/api/v2/connections" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

DB_CONN=$(echo "$DBS" | jq -r '.[] | select(.strategy == "auth0") | .id')

if [ -z "$DB_CONN" ] || [ "$DB_CONN" = "null" ]; then
  echo "🔄 Criando conexão Database (Username-Password-Authentication)..."
  
  curl -s -X POST "https://${AUTH0_DOMAIN}/api/v2/connections" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Username-Password-Authentication",
      "strategy": "auth0",
      "options": {
        "mfa": {
          "active": true,
          "return_url": "/"
        },
        "passwordPolicy": "good",
        "brute_force_protection": true
      },
      "enabled_clients": ["'"$CLIENT_ID"'"]
    }'
  
  echo "✅ Conexão Database criada"
else
  echo "✅ Conexão Database encontrada: $DB_CONN"
fi

# 9. Configurar Application Type
echo ""
echo "9️⃣ Atualizando tipo de aplicação..."

FINAL_UPDATE=$(curl -s -X PATCH "https://${AUTH0_DOMAIN}/api/v2/clients/${CLIENT_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "application_type": "spa",
    "token_endpoint_auth_method": "none",
    "is_first_party": true,
    "oidc_conformant": true,
    "cross_origin_auth": true,
    "allowed_clients": [],
    "allowed_apps_apis": []
  }')

echo "✅ Tipo de aplicação atualizado para SPA"

# 10. Mostrar configuração final
echo ""
echo "=========================================="
echo "✅ Auth0 configurado!"
echo ""
echo "📋 Configurações aplicadas:"
echo "   Client ID: $CLIENT_ID"
echo ""
echo "   ✅ Allowed Callback URLs:"
echo "      - https://irisregistro.qzz.io/api/auth/callback"
echo "      - https://irisregistro.qzz.io/api/auth/callback/google"
echo "      - https://staging.irisregistro.qzz.io/api/auth/callback"
echo "      - http://localhost:3000/api/auth/callback"
echo ""
echo "   ✅ Allowed Logout URLs:"
echo "      - https://irisregistro.qzz.io"
echo "      - https://staging.irisregistro.qzz.io"
echo "      - http://localhost:3000"
echo ""
echo "   ✅ Web Origins:"
echo "      - https://irisregistro.qzz.io"
echo "      - https://staging.irisregistro.qzz.io"
echo "      - http://localhost:3000"
echo ""
echo "📍 Para verificar no Auth0 Dashboard:"
echo "   https://manage.auth0.com/dashboard/us/guardial-app/applications/${CLIENT_ID}/settings"
echo ""
echo "⚠️ Se ainda tiver erro, verifique:"
echo "   1. Callback URL deve ser exatamente como configurado"
echo "   2. Application Type deve ser 'Regular Web Applications' ou 'SPA'"
echo "   3. OAuth Legacy Format deve estar DESATIVADO"
echo "=========================================="
