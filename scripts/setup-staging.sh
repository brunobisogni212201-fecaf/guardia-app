#!/bin/bash
# ============================================
# Script para criar ambiente de STAGING no AWS ECS
# ============================================

set -e

AWS_REGION="us-east-1"
CLUSTER="guardia-cluster"
STAGING_SERVICE="guardia-service-staging"
STAGING_TASK="guardia-app-staging"
VPC_ID="vpc-008dd58344144e978"
SUBNET_1="subnet-05ce334c00ff95efd"
SUBNET_2="subnet-0a2a69670b40359f7"
SECURITY_GROUP="sg-04bf05cdace1fdff2"

echo "🚀 Criando ambiente STAGING no AWS ECS"
echo "=========================================="

# 1. Verificar se o cluster existe
echo ""
echo "1️⃣ Verificando cluster..."
CLUSTER_EXISTS=$(aws ecs describe-clusters \
  --clusters "$CLUSTER" \
  --query 'clusters[0].status' \
  --output text \
  --region $AWS_REGION 2>/dev/null)

if [ "$CLUSTER_EXISTS" = "ACTIVE" ]; then
  echo "✅ Cluster '$CLUSTER' encontrado"
else
  echo "🔄 Criando cluster '$CLUSTER'..."
  aws ecs create-cluster --cluster-name "$CLUSTER" --region $AWS_REGION
  echo "✅ Cluster criado"
fi

# 2. Verificar Security Group
echo ""
echo "2️⃣ Verificando Security Group..."
if [ -n "$SECURITY_GROUP" ]; then
  echo "✅ Security Group: $SECURITY_GROUP"
else
  echo "🔄 Criando Security Group..."
  SG_ID=$(aws ec2 create-security-group \
    --group-name guardia-staging-sg \
    --description "Security group for Guardia Staging" \
    --vpc-id "$VPC_ID" \
    --region $AWS_REGION \
    --query 'GroupId' \
    --output text)
  
  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 3000 \
    --cidr 0.0.0.0/0 \
    --region $AWS_REGION
  
  echo "✅ Security Group criado: $SG_ID"
fi

# 3. Criar ALB para Staging
echo ""
echo "3️⃣ Configurando Load Balancer..."
ALB_STAGING="guardia-alb-staging"
TG_STAGING="guardia-tg-staging"

# Verificar se ALB já existe
ALB_EXISTS=$(aws elbv2 describe-load-balancers \
  --names "$ALB_STAGING" \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "")

if [ -z "$ALB_EXISTS" ] || [ "$ALB_EXISTS" = "None" ]; then
  echo "🔄 Criando ALB para staging..."
  
  # Criar Target Group
  TG_ARN=$(aws elbv2 create-target-group \
    --name "$TG_STAGING" \
    --protocol HTTP \
    --port 3000 \
    --vpc-id "$VPC_ID" \
    --target-type ip \
    --health-check-path "/api/health" \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text \
    --region $AWS_REGION)
  
  echo "✅ Target Group criado: $TG_STAGING"
  
  # Criar ALB
  aws elbv2 create-load-balancer \
    --name "$ALB_STAGING" \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --subnets "$SUBNET_1" "$SUBNET_2" \
    --security-groups "$SECURITY_GROUP" \
    --region $AWS_REGION > /dev/null
  
  echo "✅ ALB criado: $ALB_STAGING"
  
  # Criar Listener na porta 80
  aws elbv2 create-listener \
    --load-balancer-name "$ALB_STAGING" \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn="$TG_ARN" \
    --region $AWS_REGION > /dev/null
  
  echo "✅ Listener criado na porta 80"
else
  echo "ℹ️ ALB '$ALB_STAGING' já existe"
fi

# 4. Criar Task Definition para Staging
echo ""
echo "4️⃣ Criando Task Definition para staging..."

# Obter execution role ARN
EXEC_ROLE_ARN=$(aws iam get-role \
  --role-name ecsTaskExecutionRole \
  --query 'Role.Arn' \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole")

cat > staging-task-definition.json << 'EOF'
{
  "family": "guardia-app-staging",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "EXEC_ROLE_PLACEHOLDER",
  "containerDefinitions": [
    {
      "name": "guardia-app",
      "image": "026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app:staging-latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "staging"},
        {"name": "NEXT_PUBLIC_ENVIRONMENT", "value": "staging"},
        {"name": "PORT", "value": "3000"},
        {"name": "HOSTNAME", "value": "0.0.0.0"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/guardia-app-staging",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

sed -i "s|EXEC_ROLE_PLACEHOLDER|$EXEC_ROLE_ARN|g" staging-task-definition.json

# Registrar task definition
TASK_ARN=$(aws ecs register-task-definition \
  --cli-input-json file://staging-task-definition.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ Task Definition criada: $TASK_ARN"

# 5. Criar ou atualizar Service
echo ""
echo "5️⃣ Criando ECS Service para staging..."

SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster "$CLUSTER" \
  --services "$STAGING_SERVICE" \
  --query 'services[0].serviceName' \
  --output text \
  --region $AWS_REGION 2>/dev/null || echo "")

if [ -z "$SERVICE_EXISTS" ] || [ "$SERVICE_EXISTS" = "None" ]; then
  echo "🔄 Criando service..."
  
  aws ecs create-service \
    --cluster "$CLUSTER" \
    --service-name "$STAGING_SERVICE" \
    --task-definition "$STAGING_TASK" \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
    --load-balancers "[{targetGroupArn=$(aws elbv2 describe-target-groups --names $TG_STAGING --query 'TargetGroups[0].TargetGroupArn' --output text --region $AWS_REGION),containerName=guardia-app,containerPort=3000}]" \
    --region $AWS_REGION > /dev/null
  
  echo "✅ Service criado: $STAGING_SERVICE"
else
  echo "ℹ️ Service '$STAGING_SERVICE' já existe"
fi

# 6. Criar CloudWatch Log Group
echo ""
echo "6️⃣ Criando CloudWatch Log Group..."
aws logs create-log-group \
  --log-group-name /ecs/guardia-app-staging \
  --region $AWS_REGION 2>/dev/null && echo "✅ Log Group criado" || echo "ℹ️ Log Group já existe"

echo ""
echo "=========================================="
echo "✅ Ambiente STAGING configurado!"
echo ""
echo "📍 URLs de acesso:"
echo "   Staging: https://staging.irisregistro.qzz.io"
echo "   Produção: https://irisregistro.qzz.io"
echo ""
echo "📋 Comandos úteis:"
echo "   Ver status: aws ecs describe-services --cluster $CLUSTER --services $STAGING_SERVICE"
echo "   Ver logs: aws logs tail /ecs/guardia-app-staging --follow"
echo "   Redeploy: aws ecs update-service --cluster $CLUSTER --service $STAGING_SERVICE --force-new-deployment"
echo "=========================================="
