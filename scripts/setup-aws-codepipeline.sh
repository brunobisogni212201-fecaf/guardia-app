#!/bin/bash
# ============================================
# Script para criar CI/CD completo usando AWS CodeCommit
# Não precisa de GitHub Actions - tudo na AWS!
# ============================================

set -e

AWS_REGION="us-east-1"
PROJECT_NAME="guardia-app"
ECR_REPO="026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app"
ECS_CLUSTER="guardia-cluster"
ECS_SERVICE_PROD="guardia-service"
S3_BUCKET="guardia-cicd-artifacts-${AWS_REGION}"
ACCOUNT_ID="026544697783"

echo "🚀 Criando CI/CD completo via AWS CodePipeline + CodeCommit"
echo "============================================================"

# 1. Criar CodeCommit Repository
echo ""
echo "1️⃣ Criando CodeCommit Repository..."
REPO_NAME="guardia-app"

REPO_ARN=$(aws codecommit get-repository --repository-name "$REPO_NAME" --query 'repositoryMetadata.Arn' --output text 2>/dev/null || echo "")

if [ -z "$REPO_ARN" ]; then
    aws codecommit create-repository \
        --repository-name "$REPO_NAME" \
        --repository-description "Guardia App - Íris" \
        --region "$AWS_REGION" > /dev/null
    echo "✅ CodeCommit Repository criado: $REPO_NAME"
else
    echo "ℹ️ Repository $REPO_NAME já existe"
fi

# 2. Configurar Git Credential para CodeCommit
echo ""
echo "2️⃣ Configurando credenciais Git..."
GIT_CREDENTIAL=$(aws iam get-user --query 'UserName' --output text 2>/dev/null)
echo "Usuário IAM: $GIT_CREDENTIAL"

# Criar HTTPS Git credentials para CodeCommit
echo "📋 Para usar CodeCommit, você precisa:"
echo "   1. Acesse: AWS Console > IAM > Users > $GIT_CREDENTIAL > Security Credentials"
echo "   2. Procure 'HTTPS Git credentials for AWS CodeCommit'"
echo "   3. Clique em 'Generate credentials'"
echo "   4. Salve o usuário e senha (você precisará para git clone/push)"

# 3. Criar S3 Bucket para artifacts
echo ""
echo "3️⃣ Configurando S3 Bucket..."
if ! aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    aws s3api create-bucket \
        --bucket "$S3_BUCKET" \
        --region "$AWS_REGION" \
        --create-bucket-configuration LocationConstraint="$AWS_REGION" > /dev/null
    echo "✅ Bucket criado: $S3_BUCKET"
else
    echo "ℹ️ Bucket $S3_BUCKET já existe"
fi

# 4. Criar IAM Role para CodeBuild
echo ""
echo "4️⃣ Criando IAM Role para CodeBuild..."
CODEBUILD_ROLE_NAME="guardia-codebuild-role"

cat > /tmp/codebuild-trust-policy.json << 'EOF'
{
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
}
EOF

ROLE_ARN=$(aws iam get-role --role-name "$CODEBUILD_ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$ROLE_ARN" ]; then
    aws iam create-role \
        --role-name "$CODEBUILD_ROLE_NAME" \
        --assume-role-policy-document file:///tmp/codebuild-trust-policy.json > /dev/null
    
    # Anexar políticas
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

# 5. Criar buildspec.yml na raiz do projeto
echo ""
echo "5️⃣ Criando buildspec.yml..."

cat > /Users/brunobisogni/Desktop/guardia-app/buildspec.yml << 'EOF'
version: 0.2

env:
  variables:
    AWS_REGION: us-east-1
    ECR_REPOSITORY: 026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app
  parameter-store:
    DATABASE_URL: /guardia/DATABASE_URL
    GEMINI_API_KEY: /guardia/GEMINI_API_KEY
    AUTH0_DOMAIN: /guardia/AUTH0_DOMAIN
    AUTH0_CLIENT_ID: /guardia/AUTH0_CLIENT_ID
    AUTH0_CLIENT_SECRET: /guardia/AUTH0_CLIENT_SECRET

phases:
  install:
    runtime-versions:
      nodejs: 20
    commands:
      - echo "🔧 Installing dependencies..."
      - npm ci --legacy-peer-deps

  pre_build:
    commands:
      - echo "🏗️ Building application..."
      - |
        cat > .env.production << 'ENVEOF'
        NODE_ENV=production
        DATABASE_URL=$DATABASE_URL
        GEMINI_API_KEY=$GEMINI_API_KEY
        AUTH0_DOMAIN=$AUTH0_DOMAIN
        AUTH0_CLIENT_ID=$AUTH0_CLIENT_ID
        AUTH0_CLIENT_SECRET=$AUTH0_CLIENT_SECRET
        AWS_REGION=us-east-1
        ENVEOF
      - npm run build

  build:
    commands:
      - echo "🐳 Building Docker image..."
      - docker build --platform linux/amd64 -t guardia-app:$CODEBUILD_RESOLVED_SOURCE_VERSION .
      - docker tag guardia-app:$CODEBUILD_RESOLVED_SOURCE_VERSION $ECR_REPOSITORY:prod-$CODEBUILD_RESOLVED_SOURCE_VERSION
      - docker tag guardia-app:$CODEBUILD_RESOLVED_SOURCE_VERSION $ECR_REPOSITORY:prod-latest
      - echo "🔐 Logging into Amazon ECR..."
      - aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPOSITORY

  post_build:
    commands:
      - echo "📤 Pushing Docker image..."
      - docker push $ECR_REPOSITORY:prod-$CODEBUILD_RESOLVED_SOURCE_VERSION
      - docker push $ECR_REPOSITORY:prod-latest
      - echo "📝 Writing image definition..."
      - printf '[{"name":"guardia-app","imageUri":"%s"}]' $ECR_REPOSITORY:prod-$CODEBUILD_RESOLVED_SOURCE_VERSION > imagedefinitions.json
      - cat imagedefinitions.json
artifacts:
  files:
    - imagedefinitions.json
  name: drop
EOF

echo "✅ buildspec.yml criado"

# 6. Criar CodeBuild Project
echo ""
echo "6️⃣ Criando CodeBuild Project..."

aws codebuild create-project \
    --name "${PROJECT_NAME}-build" \
    --description "Guardia App Build - CodePipeline" \
    --service-role "arn:aws:iam::${ACCOUNT_ID}:role/${CODEBUILD_ROLE_NAME}" \
    --artifacts type=CODEPIPELINE,location="$S3_BUCKET",name="" \
    --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_SMALL,privilegedMode=true,variables='[{name: "AWS_REGION",value: "us-east-1"},{name: "ECR_REPOSITORY",value: "'"$ECR_REPOSITORY"'"}]' \
    --source type=CODECOMMIT,location="$REPO_NAME",gitCloneDepth=1 \
    --badge-enabled \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ CodeBuild Project criado" || echo "ℹ️ CodeBuild Project já existe"

# 7. Criar Pipeline
echo ""
echo "7️⃣ Criando CodePipeline..."

PIPELINE_ROLE_NAME="guardia-pipeline-role"

# Criar Role para Pipeline
cat > /tmp/pipeline-trust-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "codepipeline.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

PIPELINE_ROLE_ARN=$(aws iam get-role --role-name "$PIPELINE_ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$PIPELINE_ROLE_ARN" ]; then
    aws iam create-role \
        --role-name "$PIPELINE_ROLE_NAME" \
        --assume-role-policy-document file:///tmp/pipeline-trust-policy.json > /dev/null
    
    aws iam attach-role-policy \
        --role-name "$PIPELINE_ROLE_NAME" \
        --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess" > /dev/null
    
    echo "✅ Pipeline Role criada"
fi

# Criar Pipeline
aws codepipeline create-pipeline \
    --pipeline name="${PROJECT_NAME}-pipeline",role-arn="arn:aws:iam::${ACCOUNT_ID}:role/${PIPELINE_ROLE_NAME}",artifact-store=type=S3,location="$S3_BUCKET",stages='[{name:"Source",actions:[{name:"SourceAction",actionTypeId:{category:"Source",owner:"AWS",provider:"CodeCommit",version:"1"},configuration:{RepositoryName:"'"$REPO_NAME"'",BranchName:"main",OutputArtifactFormat:"CODEPIPELINE_ARTIFACT"},runOrder:1,outputArtifacts:[{name:"SourceArtifact"}]}]},{name:"Build",actions:[{name:"BuildAction",actionTypeId:{category:"Build",owner:"AWS",provider:"CodeBuild",version:"1"},configuration:{ProjectName:"'"${PROJECT_NAME}-build"'"},inputArtifacts:[{name:"SourceArtifact"}],outputArtifacts:[{name:"BuildArtifact"}],runOrder:1}]},{name:"Deploy",actions:[{name:"DeployAction",actionTypeId:{category:"Deploy",owner:"AWS",provider:"ECS",version:"1"},configuration:{ClusterName:"'"$ECS_CLUSTER"'",ServiceName:"'"$ECS_SERVICE_PROD"'",FileName:"imagedefinitions.json"},inputArtifacts:[{name:"BuildArtifact"}],runOrder:1}]}]' \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ Pipeline criado" || echo "ℹ️ Pipeline já existe"

# 8. Criar EventBridge para auto-trigger
echo ""
echo "8️⃣ Configurando auto-trigger em push..."

# Criar regra para trigger automático
aws events put-rule \
    --name "${PROJECT_NAME}-source-change" \
    --description "Trigger pipeline on source change" \
    --event-pattern '{"source":["aws.codecommit"],"detail-type":["CodeCommit Repository State Change"],"resources":["arn:aws:codecommit:'"$AWS_REGION"':'"$ACCOUNT_ID"':'"$REPO_NAME"'"],"detail":{"referenceType":["branch"],"referenceName":["main"]}}' \
    --region "$AWS_REGION" 2>/dev/null

# Adicionar target (pipeline)
aws events put-targets \
    --rule "${PROJECT_NAME}-source-change" \
    --targets '{"Id":"GuardiaPipeline","Arn":"arn:aws:codepipeline:'"$AWS_REGION"':'"$ACCOUNT_ID"':'"${PROJECT_NAME}-pipeline"'","RoleArn":"arn:aws:iam::'"$ACCOUNT_ID"':role/service-role/AWSEventsServiceRole"}' \
    --region "$AWS_REGION" 2>/dev/null

echo "✅ Auto-trigger configurado"

# 9. Configurar Parameter Store para secrets
echo ""
echo "9️⃣ Configurando Parameter Store para secrets..."

aws ssm put-parameter \
    --name "/guardia/DATABASE_URL" \
    --value "postgresql://guardia:Guardia2024@guardia-db.catawsu2siuo.us-east-1.rds.amazonaws.com:5432/guardia" \
    --type SecureString \
    --overwrite \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ DATABASE_URL configurado" || echo "ℹ️ DATABASE_URL já existe"

aws ssm put-parameter \
    --name "/guardia/GEMINI_API_KEY" \
    --value "AIzaSyBjvHEcQEH0Hmpn88YtVjPlpe1HRW18LEQ" \
    --type SecureString \
    --overwrite \
    --region "$AWS_REGION" 2>/dev/null && echo "✅ GEMINI_API_KEY configurado" || echo "ℹ️ GEMINI_API_KEY já existe"

echo ""
echo "============================================================"
echo "✅ CI/CD Pipeline AWS CodePipeline criado!"
echo ""
echo "📍 URLs de acesso:"
echo "   Pipeline: https://console.aws.amazon.com/codepipeline/home?region=$AWS_REGION"
echo "   CodeBuild: https://console.aws.amazon.com/codebuild/home?region=$AWS_REGION"
echo "   CodeCommit: https://console.aws.amazon.com/codesuite/codecommit/repositories?region=$AWS_REGION"
echo ""
echo "📋 Próximos passos:"
echo "   1. Clone o repositório CodeCommit"
echo "   2. Adicione o remote do CodeCommit"
echo "   3. Push para CodeCommit: main"
echo "   4. Pipeline será disparado automaticamente"
echo ""
echo "📝 Comandos Git para configurar CodeCommit:"
echo "   git remote add codecommit https://git-codecommit.${AWS_REGION}.amazonaws.com/v1/repos/guardia-app"
echo "   git push codecommit main"
echo ""
echo "⚠️ IMPORTANTE: Configure Parameter Store com seus secrets reais"
echo "============================================================"

# Mostrar URL do CodeCommit clone
echo ""
echo "🔗 Clone URL:"
echo "   HTTPS: https://git-codecommit.${AWS_REGION}.amazonaws.com/v1/repos/${REPO_NAME}"
