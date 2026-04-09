#!/bin/bash
# ============================================
# Script para criar CI/CD com GitHub Webhook via API AWS
# CodePipeline + CodeBuild + GitHub Webhook
# ============================================

set -e

AWS_REGION="us-east-1"
PROJECT_NAME="guardia-app"
ECR_REPO="026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app"
ECS_CLUSTER="guardia-cluster"
ECS_SERVICE_PROD="guardia-service"
S3_BUCKET="guardia-cicd-${AWS_REGION}"
ACCOUNT_ID="026544697783"
GITHUB_OWNER="brunobisogni212201-fecaf"
GITHUB_REPO="guardia-app"
GITHUB_BRANCH="main"

echo "🚀 Criando CI/CD Pipeline AWS com GitHub"
echo "=========================================="

# 1. Criar/verificar S3 Bucket
echo ""
echo "1️⃣ Configurando S3 Bucket..."
if ! aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    aws s3api create-bucket \
        --bucket "$S3_BUCKET" \
        --region "$AWS_REGION" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION" > /dev/null
    echo "✅ Bucket criado: $S3_BUCKET"
else
    echo "ℹ️ Bucket $S3_BUCKET já existe"
fi

# 2. Criar IAM Role para CodeBuild
echo ""
echo "2️⃣ Criando IAM Role para CodeBuild..."
CODEBUILD_ROLE_NAME="guardia-codebuild-role"

cat > /tmp/codebuild-trust.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "codebuild.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
}
EOF

if ! aws iam get-role --role-name "$CODEBUILD_ROLE_NAME" &>/dev/null; then
    aws iam create-role \
        --role-name "$CODEBUILD_ROLE_NAME" \
        --assume-role-policy-document file:///tmp/codebuild-trust.json > /dev/null
    
    aws iam attach-role-policy \
        --role-name "$CODEBUILD_ROLE_NAME" \
        --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess" > /dev/null
    
    aws iam attach-role-policy \
        --role-name "$CODEBUILD_ROLE_NAME" \
        --policy-arn "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser" > /dev/null
    
    echo "✅ Role $CODEBUILD_ROLE_NAME criada"
else
    echo "ℹ️ Role $CODEBUILD_ROLE_NAME já existe"
fi

# 3. Criar buildspec.yml
echo ""
echo "3️⃣ Criando buildspec.yml..."

cat > /Users/brunobisogni/Desktop/guardia-app/buildspec.yml << 'EOF'
version: 0.2

env:
  variables:
    AWS_REGION: us-east-1
    ECR_REPOSITORY: 026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app
  secrets-manager:
    DATABASE_URL: "guardia/DATABASE_URL"
    GEMINI_API_KEY: "guardia/GEMINI_API_KEY"
    AUTH0_DOMAIN: "guardia/AUTH0_DOMAIN"
    AUTH0_CLIENT_ID: "guardia/AUTH0_CLIENT_ID"
    AUTH0_CLIENT_SECRET: "guardia/AUTH0_CLIENT_SECRET"

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - echo "Installing..."
      - npm ci --legacy-peer-deps

  pre_build:
    commands:
      - echo "Building..."
      - |
        cat > .env.production << 'ENVEOF'
        NODE_ENV=production
        DATABASE_URL=$DATABASE_URL
        GEMINI_API_KEY=$GEMINI_API_KEY
        AUTH0_DOMAIN=$AUTH0_DOMAIN
        AUTH0_CLIENT_ID=$AUTH0_CLIENT_ID
        AUTH0_CLIENT_SECRET=$AUTH0_CLIENT_SECRET
        AWS_REGION=$AWS_REGION
        ENVEOF
      - npm run build

  build:
    commands:
      - echo "Building Docker image..."
      - docker build --platform linux/amd64 -t guardia-app:$CODEBUILD_RESOLVED_SOURCE_VERSION .
      - docker tag guardia-app:$CODEBUILD_RESOLVED_SOURCE_VERSION $ECR_REPOSITORY:prod-$CODEBUILD_RESOLVED_SOURCE_VERSION
      - docker tag guardia-app:$CODEBUILD_RESOLVED_SOURCE_VERSION $ECR_REPOSITORY:prod-latest
      - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY

  post_build:
    commands:
      - echo "Pushing Docker image..."
      - docker push $ECR_REPOSITORY:prod-$CODEBUILD_RESOLVED_SOURCE_VERSION
      - docker push $ECR_REPOSITORY:prod-latest
      - printf '[{"name":"guardia-app","imageUri":"%s"}]' $ECR_REPOSITORY:prod-$CODEBUILD_RESOLVED_SOURCE_VERSION > imagedefinitions.json
artifacts:
  files:
    - imagedefinitions.json
  name: drop
EOF

echo "✅ buildspec.yml criado"

# 4. Criar CodeBuild Project
echo ""
echo "4️⃣ Criando CodeBuild Project..."

aws codebuild create-project \
    --name "${PROJECT_NAME}-build" \
    --description "Guardia App Production Build" \
    --service-role "arn:aws:iam::${ACCOUNT_ID}:role/${CODEBUILD_ROLE_NAME}" \
    --artifacts type=CODEPIPELINE \
    --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_SMALL,privilegedMode=true \
    --source type=GITHUB,location="https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}",gitCloneDepth=1 \
    --badge-enabled \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ CodeBuild criado" || echo "ℹ️ CodeBuild já existe"

# 5. Criar Pipeline
echo ""
echo "5️⃣ Criando CodePipeline..."

PIPELINE_ROLE_NAME="guardia-pipeline-role"

cat > /tmp/pipeline-trust.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "codepipeline.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
}
EOF

if ! aws iam get-role --role-name "$PIPELINE_ROLE_NAME" &>/dev/null; then
    aws iam create-role \
        --role-name "$PIPELINE_ROLE_NAME" \
        --assume-role-policy-document file:///tmp/pipeline-trust.json > /dev/null
    
    aws iam attach-role-policy \
        --role-name "$PIPELINE_ROLE_NAME" \
        --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess" > /dev/null
    
    echo "✅ Pipeline Role criada"
fi

# Criar Pipeline com Source via GitHub
aws codepipeline create-pipeline \
    --pipeline '{
        "name": "'"$PROJECT_NAME"'",
        "roleArn": "arn:aws:iam::'"$ACCOUNT_ID"':role/'"$PIPELINE_ROLE_NAME"'",
        "artifactStore": {
            "type": "S3",
            "location": "'"$S3_BUCKET"'"
        },
        "stages": [
            {
                "name": "Source",
                "actions": [
                    {
                        "name": "GitHub_Source",
                        "actionTypeId": {
                            "category": "Source",
                            "owner": "ThirdParty",
                            "provider": "GitHub",
                            "version": "1"
                        },
                        "configuration": {
                            "Owner": "'"$GITHUB_OWNER"'",
                            "Repo": "'"$GITHUB_REPO"'",
                            "Branch": "'"$GITHUB_BRANCH"'",
                            "OAuthToken": "${GITHUB_TOKEN}"
                        },
                        "outputArtifacts": [{"name": "SourceArtifact"}]
                    }
                ]
            },
            {
                "name": "Build",
                "actions": [
                    {
                        "name": "CodeBuild",
                        "actionTypeId": {
                            "category": "Build",
                            "owner": "AWS",
                            "provider": "CodeBuild",
                            "version": "1"
                        },
                        "configuration": {
                            "ProjectName": "'"${PROJECT_NAME}-build"'"
                        },
                        "inputArtifacts": [{"name": "SourceArtifact"}],
                        "outputArtifacts": [{"name": "BuildArtifact"}]
                    }
                ]
            },
            {
                "name": "Deploy",
                "actions": [
                    {
                        "name": "ECS_Deploy",
                        "actionTypeId": {
                            "category": "Deploy",
                            "owner": "AWS",
                            "provider": "ECS",
                            "version": "1"
                        },
                        "configuration": {
                            "ClusterName": "'"$ECS_CLUSTER"'",
                            "ServiceName": "'"$ECS_SERVICE_PROD"'",
                            "FileName": "imagedefinitions.json"
                        },
                        "inputArtifacts": [{"name": "BuildArtifact"}]
                    }
                ]
            }
        ]
    }' \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ Pipeline criado" || echo "ℹ️ Pipeline já existe"

# 6. Configurar Secrets Manager
echo ""
echo "6️⃣ Configurando AWS Secrets Manager..."

aws secretsmanager create-secret \
    --name "guardia/DATABASE_URL" \
    --secret-string "postgresql://guardia:Guardia2024@guardia-db.catawsu2siuo.us-east-1.rds.amazonaws.com:5432/guardia" \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ DATABASE_URL" || echo "ℹ️ DATABASE_URL já existe"

aws secretsmanager create-secret \
    --name "guardia/GEMINI_API_KEY" \
    --secret-string "AIzaSyBjvHEcQEH0Hmpn88YtVjPlpe1HRW18LEQ" \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ GEMINI_API_KEY" || echo "ℹ️ GEMINI_API_KEY já existe"

aws secretsmanager create-secret \
    --name "guardia/AUTH0_DOMAIN" \
    --secret-string "guardial-app.us.auth0.com" \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ AUTH0_DOMAIN" || echo "ℹ️ AUTH0_DOMAIN já existe"

aws secretsmanager create-secret \
    --name "guardia/AUTH0_CLIENT_ID" \
    --secret-string "vF9Vtuj0vpQbqlrVX5dqIAYct6wJnOyc" \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ AUTH0_CLIENT_ID" || echo "ℹ️ AUTH0_CLIENT_ID já existe"

aws secretsmanager create-secret \
    --name "guardia/AUTH0_CLIENT_SECRET" \
    --secret-string "_ffncgyBVLTIjtYQ_9oKaSYWRZEmQYVGtsXRRek7e7Og1_sbL9f4o9J6zdduCRnE" \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ AUTH0_CLIENT_SECRET" || echo "ℹ️ AUTH0_CLIENT_SECRET já existe"

echo ""
echo "=========================================="
echo "✅ CI/CD Pipeline criado!"
echo ""
echo "📍 URLs:"
echo "   Pipeline: https://console.aws.amazon.com/codepipeline/home?region=$AWS_REGION"
echo "   CodeBuild: https://console.aws.amazon.com/codebuild/home?region=$AWS_REGION"
echo ""
echo "⚠️ PRÓXIMO PASSO: Configurar GitHub Token"
echo ""
echo "O pipeline precisa de um GitHub Personal Access Token"
echo "para acessar seu repositório."
echo ""
echo "1. Acesse: https://github.com/settings/tokens"
echo "2. Gere um novo token (classic) com scope: repo"
echo "3. Use o token para atualizar o pipeline:"
echo ""
echo "   aws codepipeline update-pipeline \\"
echo "     --pipeline name=${PROJECT_NAME} \\"
echo "     --region $AWS_REGION"
echo ""
echo "💡 Alternativa: Use CodePipeline Console para configurar"
echo "   o source GitHub interativamente e cole o token"
echo "=========================================="
