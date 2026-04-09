#!/bin/bash
# ============================================
# Script para criar CI/CD completo via AWS
# CodePipeline + CodeBuild + CodeDeploy
# ============================================

set -e

AWS_REGION="us-east-1"
PROJECT_NAME="guardia-app"
ECR_REPO="026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app"
ECS_CLUSTER="guardia-cluster"
ECS_SERVICE_PROD="guardia-service"
ECS_SERVICE_STAGING="guardia-service-staging"
S3_BUCKET="guardia-cicd-artifacts-${AWS_REGION}"
VPC_ID="vpc-008dd58344144e978"
SUBNETS="subnet-05ce334c00ff95efd,subnet-0a2a69670b40359f7"
SECURITY_GROUP="sg-04bf05cdace1fdff2"

echo "🚀 Criando CI/CD Pipeline na AWS"
echo "=================================="

# 1. Criar S3 Bucket para artifacts
echo ""
echo "1️⃣ Criando S3 Bucket para artifacts..."
if aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    echo "ℹ️ Bucket $S3_BUCKET já existe"
else
    aws s3api create-bucket \
        --bucket "$S3_BUCKET" \
        --region "$AWS_REGION" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION" > /dev/null
    echo "✅ Bucket criado: $S3_BUCKET"
fi

# Habilitar versionamento
aws s3api put-bucket-versioning \
    --bucket "$S3_BUCKET" \
    --versioning-configuration Status=Enabled \
    --region "$AWS_REGION"

# 2. Criar IAM Role para CodeBuild
echo ""
echo "2️⃣ Criando IAM Role para CodeBuild..."
CODEBUILD_ROLE="guardia-codebuild-role"

ROLE_ARN=$(aws iam get-role --role-name "$CODEBUILD_ROLE" --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$ROLE_ARN" ]; then
    aws iam create-role \
        --role-name "$CODEBUILD_ROLE" \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "codebuild.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                }
            ]
        }' > /dev/null

    aws iam attach-role-policy \
        --role-name "$CODEBUILD_ROLE" \
        --policy-arn arn:aws:iam::aws:policy/AdministratorAccess > /dev/null

    aws iam attach-role-policy \
        --role-name "$CODEBUILD_ROLE" \
        --policy-arn "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser" > /dev/null

    echo "✅ Role $CODEBUILD_ROLE criada"
else
    echo "ℹ️ Role $CODEBUILD_ROLE já existe"
fi

# 3. Criar CodeBuild Project para Production
echo ""
echo "3️⃣ Criando CodeBuild Project (Production)..."

cat > buildspec-production.yml << 'EOF'
version: 0.2

env:
  variables:
    ENVIRONMENT: production
    AWS_REGION: us-east-1
    ECR_REPOSITORY: 026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - echo "Installing dependencies..."
      - npm ci --legacy-peer-deps

  pre_build:
    commands:
      - echo "Building application..."
      - npm run build

  build:
    commands:
      - echo "Building Docker image..."
      - docker build --platform linux/amd64 --build-arg ENVIRONMENT=production -t guardia-app:production .
      - docker tag guardia-app:production $ECR_REPOSITORY:prod-latest
      - echo "Logging into Amazon ECR..."
      - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY

  post_build:
    commands:
      - echo "Pushing Docker image..."
      - docker push $ECR_REPOSITORY:prod-latest
      - echo "Writing image definition..."
      - printf '[{"name":"guardia-app","imageUri":"%s"}]' $ECR_REPOSITORY:prod-latest > imageDefinition.json
artifacts:
  files:
    - imageDefinition.json
    - task-definition.json
  secondary-artifacts:
    ImageArtifact:
      files:
        - imageDefinition.json
    TaskDefinitionArtifact:
      files:
        - task-definition.json
EOF

cat > task-definition.json << 'EOF'
{
  "family": "guardia-app-prod",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::026544697783:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "guardia-app",
      "image": "IMAGE_URI",
      "essential": true,
      "portMappings": [{"containerPort": 3000, "protocol": "tcp"}],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3000"},
        {"name": "HOSTNAME", "value": "0.0.0.0"},
        {"name": "AWS_REGION", "value": "us-east-1"},
        {"name": "AWS_S3_BUCKET_ANALYSIS", "value": "guardia-uploads-us-east-1"},
        {"name": "APP_URL", "value": "https://irisregistro.qzz.io"}
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
  ]
}
EOF

# Criar CodeBuild project
aws codebuild create-project \
    --name "${PROJECT_NAME}-production" \
    --description "Guardia App Production Build" \
    --service-role "arn:aws:iam::026544697783:role/${CODEBUILD_ROLE}" \
    --artifacts type=S3,bucket-name="$S3_BUCKET",name="production-build",encryption-disabled=false \
    --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_SMALL,privilegedMode=true \
    --source type=GITHUB,location="https://github.com/brunobisogni212201-fecaf/guardia-app",gitCloneDepth=1,gitSubmodulesConfig={status=DISABLED} \
    --secondary-sources type=GITHUB,location="https://github.com/brunobisogni212201-fecaf/guardia-app",identifier=source \
    --secondary-artifacts '[{"type":"S3","location":"'"$S3_BUCKET"'","name":"ImageArtifact","encryptionDisabled":false},{"type":"S3","location":"'"$S3_BUCKET"'","name":"TaskDefinitionArtifact","encryption-disabled":false}]' \
    --badge-enabled \
    --region "$AWS_REGION" 2>/dev/null || echo "ℹ️ Project production já existe"

echo "✅ CodeBuild Project criado"

# 4. Criar CodeBuild Project para Staging
echo ""
echo "4️⃣ Criando CodeBuild Project (Staging)..."

cat > buildspec-staging.yml << 'EOF'
version: 0.2

env:
  variables:
    ENVIRONMENT: staging
    AWS_REGION: us-east-1
    ECR_REPOSITORY: 026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - echo "Installing dependencies..."
      - npm ci --legacy-peer-deps

  pre_build:
    commands:
      - echo "Building application..."
      - npm run build

  build:
    commands:
      - echo "Building Docker image..."
      - docker build --platform linux/amd64 --build-arg ENVIRONMENT=staging -t guardia-app:staging .
      - docker tag guardia-app:staging $ECR_REPOSITORY:staging-latest
      - echo "Logging into Amazon ECR..."
      - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY

  post_build:
    commands:
      - echo "Pushing Docker image..."
      - docker push $ECR_REPOSITORY:staging-latest
      - printf '[{"name":"guardia-app","imageUri":"%s"}]' $ECR_REPOSITORY:staging-latest > imageDefinition.json
artifacts:
  files:
    - imageDefinition.json
EOF

aws codebuild create-project \
    --name "${PROJECT_NAME}-staging" \
    --description "Guardia App Staging Build" \
    --service-role "arn:aws:iam::026544697783:role/${CODEBUILD_ROLE}" \
    --artifacts type=S3,bucket-name="$S3_BUCKET",name="staging-build",encryption-disabled=false \
    --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_SMALL,privilegedMode=true \
    --source type=GITHUB,location="https://github.com/brunobisogni212201-fecaf/guardia-app",gitCloneDepth=1,identifier=source \
    --badge-enabled \
    --region "$AWS_REGION" 2>/dev/null || echo "ℹ️ Project staging já existe"

echo "✅ CodeBuild Project (Staging) criado"

# 5. Criar Pipeline
echo ""
echo "5️⃣ Criando CodePipeline..."

# Criar pipeline para Production
aws codepipeline create-pipeline \
    --pipeline "{
        \"name\": \"${PROJECT_NAME}-production\",
        \"roleArn\": \"arn:aws:iam::026544697783:role/aws-codepipeline-service-role\",
        \"artifactStore\": {
            \"type\": \"S3\",
            \"location\": \"$S3_BUCKET\"
        },
        \"stages\": [
            {
                \"name\": \"Source\",
                \"actions\": [
                    {
                        \"name\": \"SourceAction\",
                        \"actionTypeId\": {
                            \"category\": \"Source\",
                            \"owner\": \"ThirdParty\",
                            \"provider\": \"GitHub\",
                            \"version\": \"1\"
                        },
                        \"configuration\": {
                            \"Owner\": \"brunobisogni212201-fecaf\",
                            \"Repo\": \"guardia-app\",
                            \"Branch\": \"main\",
                            \"OAuthToken\": \"\${GITHUB_TOKEN}\"
                        },
                        \"outputArtifacts\": [{\"name\": \"SourceArtifact\"}],
                        \"runOrder\": 1
                    }
                ]
            },
            {
                \"name\": \"Build\",
                \"actions\": [
                    {
                        \"name\": \"BuildAction\",
                        \"actionTypeId\": {
                            \"category\": \"Build\",
                            \"owner\": \"AWS\",
                            \"provider\": \"CodeBuild\",
                            \"version\": \"1\"
                        },
                        \"configuration\": {
                            \"ProjectName\": \"${PROJECT_NAME}-production\"
                        },
                        \"inputArtifacts\": [{\"name\": \"SourceArtifact\"}],
                        \"outputArtifacts\": [{\"name\": \"BuildArtifact\"}],
                        \"runOrder\": 1
                    }
                ]
            },
            {
                \"name\": \"Deploy\",
                \"actions\": [
                    {
                        \"name\": \"DeployAction\",
                        \"actionTypeId\": {
                            \"category\": \"Deploy\",
                            \"owner\": \"AWS\",
                            \"provider\": \"ECS\",
                            \"version\": \"1\"
                        },
                        \"configuration\": {
                            \"ClusterName\": \"$ECS_CLUSTER\",
                            \"ServiceName\": \"$ECS_SERVICE_PROD\",
                            \"FileName\": \"imagedefinitions.json\"
                        },
                        \"inputArtifacts\": [{\"name\": \"BuildArtifact\"}],
                        \"runOrder\": 1
                    }
                ]
            }
        ]
    }" \
    --region "$AWS_REGION" 2>/dev/null || echo "ℹ️ Pipeline production já existe ou precisa de ajustes"

# Criar pipeline para Staging
aws codepipeline create-pipeline \
    --pipeline "{
        \"name\": \"${PROJECT_NAME}-staging\",
        \"roleArn\": \"arn:aws:iam::026544697783:role/aws-codepipeline-service-role\",
        \"artifactStore\": {
            \"type\": \"S3\",
            \"location\": \"$S3_BUCKET\"
        },
        \"stages\": [
            {
                \"name\": \"Source\",
                \"actions\": [
                    {
                        \"name\": \"SourceAction\",
                        \"actionTypeId\": {
                            \"category\": \"Source\",
                            \"owner\": \"ThirdParty\",
                            \"provider\": \"GitHub\",
                            \"version\": \"1\"
                        },
                        \"configuration\": {
                            \"Owner\": \"brunobisogni212201-fecaf\",
                            \"Repo\": \"guardia-app\",
                            \"Branch\": \"develop\",
                            \"OAuthToken\": \"\${GITHUB_TOKEN}\"
                        },
                        \"outputArtifacts\": [{\"name\": \"SourceArtifact\"}],
                        \"runOrder\": 1
                    }
                ]
            },
            {
                \"name\": \"Build\",
                \"actions\": [
                    {
                        \"name\": \"BuildAction\",
                        \"actionTypeId\": {
                            \"category\": \"Build\",
                            \"owner\": \"AWS\",
                            \"provider\": \"CodeBuild\",
                            \"version\": \"1\"
                        },
                        \"configuration\": {
                            \"ProjectName\": \"${PROJECT_NAME}-staging\"
                        },
                        \"inputArtifacts\": [{\"name\": \"SourceArtifact\"}],
                        \"outputArtifacts\": [{\"name\": \"BuildArtifact\"}],
                        \"runOrder\": 1
                    }
                ]
            },
            {
                \"name\": \"Deploy\",
                \"actions\": [
                    {
                        \"name\": \"DeployAction\",
                        \"actionTypeId\": {
                            \"category\": \"Deploy\",
                            \"owner\": \"AWS\",
                            \"provider\": \"ECS\",
                            \"version\": \"1\"
                        },
                        \"configuration\": {
                            \"ClusterName\": \"$ECS_CLUSTER\",
                            \"ServiceName\": \"$ECS_SERVICE_STAGING\",
                            \"FileName\": \"imagedefinitions.json\"
                        },
                        \"inputArtifacts\": [{\"name\": \"BuildArtifact\"}],
                        \"runOrder\": 1
                    }
                ]
            }
        ]
    }" \
    --region "$AWS_REGION" 2>/dev/null || echo "ℹ️ Pipeline staging já existe ou precisa de ajustes"

echo "✅ CodePipeline criado"

# 6. Criar SNS para notificações
echo ""
echo "6️⃣ Criando SNS para notificações..."

SNS_TOPIC="arn:aws:sns:us-east-1:026544697783:guardia-cicd-notifications"

aws sns create-topic \
    --name "guardia-cicd-notifications" \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ SNS Topic criado" || echo "ℹ️ SNS Topic já existe"

# Configurar notificações no pipeline
aws codepipeline put-pipeline-version-level-metrics \
    --pipeline-name "${PROJECT_NAME}-production" \
    --region "$AWS_REGION" 2>/dev/null || true

echo ""
echo "=========================================="
echo "✅ CI/CD Pipeline AWS criado com sucesso!"
echo ""
echo "📍 URLs de acesso:"
echo "   CodePipeline: https://console.aws.amazon.com/codepipeline/"
echo "   CodeBuild: https://console.aws.amazon.com/codebuild/"
echo ""
echo "📋 Pipelines criados:"
echo "   - ${PROJECT_NAME}-production (branch: main)"
echo "   - ${PROJECT_NAME}-staging (branch: develop)"
echo ""
echo "⚠️ IMPORTANTE: Para ativar o pipeline, você precisa:"
echo "   1. Criar um GitHub Personal Access Token"
echo "   2. Criar Webhook no CodePipeline para GitHub"
echo ""
echo "💡 Alternativa: Use CodeCommit em vez de GitHub"
echo "=========================================="
