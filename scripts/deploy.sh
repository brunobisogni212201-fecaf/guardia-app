#!/bin/bash

set -e

# ===================================================
# Guardiã App — Deploy automatizado para AWS ECS
# Uso: bash scripts/deploy.sh [--skip-build]
# ===================================================

AWS_REGION="us-east-1"
ECR_REPOSITORY="guardia-app"
CLUSTER_NAME="guardia-cluster"
SERVICE_NAME="guardia-service"
TASK_FAMILY="guardia-app"
SKIP_BUILD=false

for arg in "$@"; do
  [[ "$arg" == "--skip-build" ]] && SKIP_BUILD=true
done

# ── Dependências ────────────────────────────────────
command -v aws    >/dev/null 2>&1 || { echo "❌ aws CLI não encontrado. Instale: brew install awscli"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ docker não encontrado."; exit 1; }

# ── Identidade AWS ──────────────────────────────────
echo "🔍 Verificando credenciais AWS..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null) || {
  echo "❌ Credenciais AWS inválidas. Configure AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY."
  exit 1
}
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_TAG=$(date +%Y%m%d%H%M%S)
FULL_IMAGE_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"

echo ""
echo "=================================="
echo " 🚀 Deploy Guardiã App"
echo "=================================="
echo " Conta   : ${AWS_ACCOUNT_ID}"
echo " Região  : ${AWS_REGION}"
echo " Imagem  : ${FULL_IMAGE_URI}"
echo " Pular build: ${SKIP_BUILD}"
echo "=================================="
echo ""

# ── 1. Login ECR ────────────────────────────────────
echo "🔐 Login no ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

if [ "$SKIP_BUILD" = false ]; then
  # ── 2. Build (forçar amd64 — compatível com Fargate) ─
  echo ""
  echo "🏗️  Build Docker (linux/amd64)..."
  docker build \
    --platform linux/amd64 \
    -t "${ECR_REPOSITORY}:${IMAGE_TAG}" \
    -f Dockerfile \
    .

  # ── 3. Tag & Push ───────────────────────────────────
  echo ""
  echo "📤 Push para ECR..."
  docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${FULL_IMAGE_URI}"
  docker push "${FULL_IMAGE_URI}"

  # Também atualizar tag :latest
  docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"
  docker push "${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"
  echo "✅ Imagem enviada: ${FULL_IMAGE_URI}"
else
  # Usa a imagem :latest já existente
  FULL_IMAGE_URI="${ECR_REGISTRY}/${ECR_REPOSITORY}:latest"
  echo "⏭️  Build pulado — usando imagem: ${FULL_IMAGE_URI}"
fi

# ── 4. Registrar Task Definition ────────────────────
echo ""
echo "📋 Registrando Task Definition..."

# Lê variáveis do .env local (se existir)
source_env() {
  local key="$1"
  local default="$2"
  # Tenta ler do ambiente ou do .env
  local val="${!key}"
  if [[ -z "$val" && -f ".env" ]]; then
    val=$(grep "^${key}=" .env | head -1 | cut -d'=' -f2-)
  fi
  echo "${val:-$default}"
}

DB_URL=$(source_env "DATABASE_URL" "")
GEMINI_KEY=$(source_env "GEMINI_API_KEY" "")
S3_BUCKET=$(source_env "AWS_S3_BUCKET_ANALYSIS" "guardia-analysis-archive")
S3_ENDPOINT=$(source_env "AWS_S3_ENDPOINT" "")
COGNITO_ID=$(source_env "COGNITO_CLIENT_ID" "796qit0m80shb7g4v8vuvg2p86")
APP_ACCESS_KEY=$(source_env "AWS_ACCESS_KEY_ID" "")
APP_SECRET_KEY=$(source_env "AWS_SECRET_ACCESS_KEY" "")
MAPS_KEY=$(source_env "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" "")
IP_SALT=$(source_env "IP_HASH_SALT" "guardia-geo-salt-2025")

TASK_DEF=$(cat <<EOJSON
{
  "family": "${TASK_FAMILY}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "guardia-app",
      "image": "${FULL_IMAGE_URI}",
      "essential": true,
      "portMappings": [
        { "containerPort": 3000, "protocol": "tcp" }
      ],
      "environment": [
        { "name": "NODE_ENV",                 "value": "production" },
        { "name": "PORT",                     "value": "3000" },
        { "name": "HOSTNAME",                 "value": "0.0.0.0" },
        { "name": "AWS_REGION",               "value": "${AWS_REGION}" },
        { "name": "AWS_ACCESS_KEY_ID",        "value": "${APP_ACCESS_KEY}" },
        { "name": "AWS_SECRET_ACCESS_KEY",    "value": "${APP_SECRET_KEY}" },
        { "name": "AWS_S3_BUCKET_ANALYSIS",   "value": "${S3_BUCKET}" },
        { "name": "AWS_S3_ENDPOINT",          "value": "${S3_ENDPOINT}" },
        { "name": "AWS_S3_FORCE_PATH_STYLE",  "value": "false" },
        { "name": "COGNITO_CLIENT_ID",        "value": "${COGNITO_ID}" },
        { "name": "DATABASE_URL",                        "value": "${DB_URL}" },
        { "name": "GEMINI_API_KEY",                      "value": "${GEMINI_KEY}" },
        { "name": "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",     "value": "${MAPS_KEY}" },
        { "name": "IP_HASH_SALT",                        "value": "${IP_SALT}" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/guardia-app",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOJSON
)

NEW_TASK_ARN=$(aws ecs register-task-definition \
  --region "${AWS_REGION}" \
  --cli-input-json "${TASK_DEF}" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ Task Definition: ${NEW_TASK_ARN}"

# ── 5. Atualizar Serviço ECS ────────────────────────
echo ""
echo "🔄 Atualizando serviço ECS..."
SERVICE_STATUS=$(aws ecs describe-services \
  --cluster "${CLUSTER_NAME}" \
  --services "${SERVICE_NAME}" \
  --region "${AWS_REGION}" \
  --query 'services[0].status' \
  --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$SERVICE_STATUS" = "ACTIVE" ]; then
  aws ecs update-service \
    --cluster "${CLUSTER_NAME}" \
    --service "${SERVICE_NAME}" \
    --task-definition "${NEW_TASK_ARN}" \
    --desired-count 1 \
    --force-new-deployment \
    --region "${AWS_REGION}" \
    --output text --query 'service.serviceArn' > /dev/null
  echo "✅ Serviço atualizado com force-new-deployment"
else
  echo "⚠️  Serviço '${SERVICE_NAME}' não encontrado ou inativo (status: ${SERVICE_STATUS})"
  echo "    Crie o serviço manualmente ou execute scripts/setup-infra.sh"
  exit 1
fi

# ── 6. Aguardar estabilização ───────────────────────
echo ""
echo "⏳ Aguardando estabilização do serviço (máx. 5 min)..."
aws ecs wait services-stable \
  --cluster "${CLUSTER_NAME}" \
  --services "${SERVICE_NAME}" \
  --region "${AWS_REGION}" && echo "✅ Serviço estável!" || echo "⚠️  Timeout — verifique manualmente"

# ── 7. Obter URL pública ────────────────────────────
echo ""
echo "🔍 Obtendo URL pública..."

TASK_ARN=$(aws ecs list-tasks \
  --cluster "${CLUSTER_NAME}" \
  --service-name "${SERVICE_NAME}" \
  --region "${AWS_REGION}" \
  --query 'taskArns[0]' \
  --output text 2>/dev/null)

if [[ -n "$TASK_ARN" && "$TASK_ARN" != "None" ]]; then
  ENI_ID=$(aws ecs describe-tasks \
    --cluster "${CLUSTER_NAME}" \
    --tasks "${TASK_ARN}" \
    --region "${AWS_REGION}" \
    --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
    --output text 2>/dev/null)

  if [[ -n "$ENI_ID" && "$ENI_ID" != "None" ]]; then
    PUBLIC_IP=$(aws ec2 describe-network-interfaces \
      --network-interface-ids "${ENI_ID}" \
      --region "${AWS_REGION}" \
      --query 'NetworkInterfaces[0].Association.PublicIp' \
      --output text 2>/dev/null)
  fi
fi

echo ""
echo "=============================================="
echo " ✅ Deploy concluído!"
echo "=============================================="
if [[ -n "$PUBLIC_IP" && "$PUBLIC_IP" != "None" ]]; then
  echo " 🌐 URL: http://${PUBLIC_IP}:3000"
  echo " 🔬 Health: curl http://${PUBLIC_IP}:3000/api/health"
else
  echo " 🌐 IP ainda sendo atribuído — consulte:"
  echo "    aws ecs list-tasks --cluster ${CLUSTER_NAME} --service-name ${SERVICE_NAME} --region ${AWS_REGION}"
fi
echo " 📋 Task: ${NEW_TASK_ARN}"
echo " 📊 Logs: aws logs tail /ecs/guardia-app --follow --region ${AWS_REGION}"
echo "=============================================="
