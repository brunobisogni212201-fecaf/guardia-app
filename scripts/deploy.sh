#!/bin/bash

set -e

echo "=== Deploy Completo Guardiã App ==="

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
ECR_REPOSITORY="guardia-app"
CLUSTER_NAME="guardia-cluster"
SERVICE_NAME="guardia-service"
DOCKER_TAG=$(date +%Y%m%d%H%M%S)
IMAGE_NAME="${ECR_REPOSITORY}:${DOCKER_TAG}"
FULL_IMAGE_NAME="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${IMAGE_NAME}"

echo "Account: ${AWS_ACCOUNT_ID}"
echo "Region: ${AWS_REGION}"
echo "Image: ${FULL_IMAGE_NAME}"

# 1. Login ECR
echo "=== Login ECR ==="
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# 2. Build
echo "=== Build Docker ==="
docker build -t ${IMAGE_NAME} .

# 3. Tag & Push
echo "=== Push para ECR ==="
docker tag ${IMAGE_NAME} ${FULL_IMAGE_NAME}
docker push ${FULL_IMAGE_NAME}

# 4. Register Task Definition
echo "=== Registrando Task Definition ==="
TASK_DEFINITION=$(cat aws/ecs-task-definition.json | sed "s/\${AWS_ACCOUNT_ID}/${AWS_ACCOUNT_ID}/g" | sed "s/\${AWS_REGION}/${AWS_REGION}/g" | sed "s/\${IMAGE_URI}/${FULL_IMAGE_NAME}/g")

aws ecs register-task-definition \
  --region ${AWS_REGION} \
  --cli-input-json "${TASK_DEFINITION}" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text

# 5. Update or Create Service
echo "=== Atualizando Serviço ECS ==="
SERVICE_EXISTS=$(aws ecs describe-services --cluster ${CLUSTER_NAME} --services ${SERVICE_NAME} --region ${AWS_REGION} --query 'services[0].status' 2>/dev/null || echo "NOT_FOUND")

if [ "$SERVICE_EXISTS" = "ACTIVE" ]; then
  aws ecs update-service \
    --cluster ${CLUSTER_NAME} \
    --service ${SERVICE_NAME} \
    --task-definition ${ECR_REPOSITORY}:${DOCKER_TAG} \
    --desired-count 1 \
    --region ${AWS_REGION}
  echo "Serviço atualizado!"
else
  aws ecs create-service \
    --cluster ${CLUSTER_NAME} \
    --service-name ${SERVICE_NAME} \
    --task-definition ${ECR_REPOSITORY} \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=subnet-XXXXXXXX,subnet-YYYYYYYY,securityGroups=sg-XXXXXXXX,assignPublicIp=ENABLED}" \
    --region ${AWS_REGION}
  echo "Serviço criado!"
fi

echo ""
echo "=== Deploy Concluído! ==="
echo "Verifique o serviço em: https://console.aws.amazon.com/ecs/home?region=${AWS_REGION}/clusters/${CLUSTER_NAME}/services/${SERVICE_NAME}"