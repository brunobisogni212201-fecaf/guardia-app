#!/bin/bash

set -e

echo "🚀 Deploy Guardiã na AWS"
echo "========================"

AWS_REGION="us-east-1"
ECR_REPO="guardia-app"
APP_RUNNER_SERVICE="guardia-app-service"
IMAGE_TAG="latest"

# Get AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --region $AWS_REGION)
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

echo "AWS Account: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo "ECR URL: $ECR_URL"

# Login to ECR
echo ""
echo "1️⃣ Login to Amazon ECR..."
aws ecr get-login-password --region $AWS_REGION --profile guardia | docker login --username AWS --password-stdin $ECR_URL

# Build Docker image
echo ""
echo "2️⃣ Building Docker image..."
docker build -t $ECR_REPO:$IMAGE_TAG .

# Tag image for ECR
docker tag $ECR_REPO:$IMAGE_TAG $ECR_URL:$IMAGE_TAG

# Push to ECR
echo ""
echo "3️⃣ Pushing image to ECR..."
docker push $ECR_URL:$IMAGE_TAG

# Update ECS service
echo ""
echo "4️⃣ Updating ECS service..."

# Get current task definition
TASK_DEF=$(aws ecs describe-task-definition --task-definition guardia-app:8 --query "taskDefinition" --region $AWS_REGION --profile guardia)

# Update environment variables
aws ecs register-task-definition \
  --family guardia-app \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 256 \
  --memory 512 \
  --execution-role-arn arn:aws:iam::026544697783:role/ecsTaskExecutionRole \
  --container-definitions '[
    {
      "name": "guardia-app",
      "image": "'$ECR_URL:$IMAGE_TAG'",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "DATABASE_URL", "value": "postgresql://guardia:Guardia2024!@guardia-db-new.catawsu2siuo.us-east-1.rds.amazonaws.com:5432/guardia"},
        {"name": "GEMINI_API_KEY", "value": "AIzaSyBjvHEcQEH0Hmpn88YtVjPlpe1HRW18LEQ"},
        {"name": "GEMINI_MODEL", "value": "gemini-2.5-flash"},
        {"name": "AWS_REGION", "value": "us-east-1"},
        {"name": "AWS_ACCESS_KEY_ID", "value": "AKIAQMLRP6G3T3VDU66D"},
        {"name": "AWS_SECRET_ACCESS_KEY", "value": "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"},
        {"name": "AWS_S3_BUCKET", "value": "guardia-uploads-us-east-1"},
        {"name": "NEXT_PUBLIC_COGNITO_CLIENT_ID", "value": "6ud0eelquvp1vijcsrb564721k"},
        {"name": "NEXT_PUBLIC_COGNITO_USER_POOL_ID", "value": "us-east-1_iwU4xEMtV"},
        {"name": "COGNITO_CLIENT_SECRET", "value": "1mlersh33d5f6cb95ftoga5q3rlsq25hl2qtlp22kg72fuduuadk"},
        {"name": "MONGODB_URI", "value": "mongodb+srv://bruno_db_user_guardia:Amor121314%40%23%24@guardia.oxncauv.mongodb.net/?appName=guardia"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/guardia-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]' \
  --region $AWS_REGION \
  --profile guardia

# Force new deployment
aws ecs update-service \
  --cluster guardia-cluster \
  --service guardia-service \
  --force-new-deployment \
  --region $AWS_REGION \
  --profile guardia

echo "✅ ECS service updated!"

# Get service URL
echo ""
echo "5️⃣ Getting service URL..."
sleep 15

ALB_DNS=$(aws elbv2 describe-load-balancers --name guardia-alb --query "LoadBalancers[0].DNSName" --output text --region $AWS_REGION --profile guardia)

echo ""
echo "========================"
echo "✅ Deploy complete!"
echo "🌐 App URL: http://$ALB_DNS"
echo "========================"