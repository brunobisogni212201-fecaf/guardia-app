#!/bin/bash

set -e

echo "=== Deploy Guardiã App para AWS ECS ==="

# Variables
AWS_REGION="us-east-1"
ECR_REPOSITORY="guardia-app"
CLUSTER_NAME="guardia-cluster"
SERVICE_NAME="guardia-service"
DOCKER_TAG="${1:-latest}"
IMAGE_NAME="${ECR_REPOSITORY}:${DOCKER_TAG}"
FULL_IMAGE_NAME="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}"

# Obter Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
echo "Account ID: ${AWS_ACCOUNT_ID}"

# 1. Criar repositório ECR se não existir
echo "=== Criando repositório ECR ==="
aws ecr create-repository --repository-name ${ECR_REPOSITORY} --region ${AWS_REGION} 2>/dev/null || echo "Repositório já existe"

# 2. Login no ECR
echo "=== Login no ECR ==="
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# 3. Build da imagem (requer Docker rodando)
echo "=== Build da imagem Docker ==="
docker build -t ${IMAGE_NAME} .

# 4. Taggear imagem
echo "=== Taggear imagem ==="
docker tag ${IMAGE_NAME} ${FULL_IMAGE_NAME}

# 5. Push para ECR
echo "=== Push para ECR ==="
docker push ${FULL_IMAGE_NAME}

echo "=== Deploy concluído! ==="
echo "Imagem: ${FULL_IMAGE_NAME}"