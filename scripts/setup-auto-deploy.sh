#!/bin/bash
# ============================================
# Script para configurar Auto-Deploy via AWS EventBridge + CodeCommit
# Solução serverless e totalmente gerenciada pela AWS
# ============================================

set -e

AWS_REGION="us-east-1"
PROJECT_NAME="guardia-app"
ECR_REPO="026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app"
ECS_CLUSTER="guardia-cluster"
ECS_SERVICE_PROD="guardia-service"
S3_BUCKET="guardia-cicd-${AWS_REGION}"
ACCOUNT_ID="026544697783"
REPO_NAME="guardia-app"

echo "🔄 Configurando Auto-Deploy via AWS EventBridge"
echo "================================================"

# 1. Criar CodeCommit Repository
echo ""
echo "1️⃣ Criando CodeCommit Repository..."
aws codecommit create-repository \
    --repository-name "$REPO_NAME" \
    --repository-description "Guardia App - Íris" \
    --region "$AWS_REGION" 2>/dev/null || echo "ℹ️ Repository já existe"

echo "✅ CodeCommit Repository criado: $REPO_NAME"

# 2. Criar EventBridge Rule para triggers
echo ""
echo "2️⃣ Criando EventBridge Rule para auto-deploy..."

# Regra para pushes na branch main (Production)
aws events put-rule \
    --name "${PROJECT_NAME}-deploy-prod" \
    --description "Auto-deploy to production on main branch push" \
    --event-pattern '{
        "source": ["aws.codecommit"],
        "detail-type": ["CodeCommit Repository State Change"],
        "resources": ["arn:aws:codecommit:'"$AWS_REGION"':'"$ACCOUNT_ID"':'"$REPO_NAME"'"],
        "detail": {
            "referenceType": ["branch"],
            "referenceName": ["main"]
        }
    }' \
    --region "$AWS_REGION" 2>/dev/null || echo "ℹ️ Rule já existe"

echo "✅ EventBridge Rule criada: ${PROJECT_NAME}-deploy-prod"

# 3. Criar Lambda para trigger do deploy
echo ""
echo "3️⃣ Criando Lambda function para trigger..."

cat > /tmp/lambda-deployment-trigger.py << 'LAMBDAEOF'
import json
import boto3

ecs_client = boto3.client('ecs')
codebuild_client = boto3.client('codebuild')

CLUSTER_NAME = 'guardia-cluster'
SERVICE_NAME = 'guardia-service'
PROJECT_NAME = 'guardia-app'
ECR_REPO = '026544697783.dkr.ecr.us-east-1.amazonaws.com/guardia-app'
AWS_REGION = 'us-east-1'

def lambda_handler(event, context):
    print("Received event:", json.dumps(event))
    
    # Get commit info
    detail = event.get('detail', {})
    commit_id = detail.get('commitId', '')
    branch = detail.get('referenceName', 'main')
    
    print(f"Processing commit {commit_id} on branch {branch}")
    
    # Start CodeBuild project
    try:
        response = codebuild_client.start_build(
            projectName=f'{PROJECT_NAME}-build',
            sourceVersion=commit_id
        )
        print(f"Build started: {response['build']['id']}")
        
        # Wait for build to complete
        build_id = response['build']['id']
        
        waiter = codebuild_client.get_waiter('build_complete')
        waiter.wait(
            projectName=f'{PROJECT_NAME}-build',
            id=build_id
        )
        
        # Get build output
        build = codebuild_client.batch_get_builds(
            ids=[build_id]
        )['builds'][0]
        
        if build['buildStatus'] == 'SUCCEEDED':
            print("Build succeeded!")
            
            # Update ECS service
            ecs_client.update_service(
                cluster=CLUSTER_NAME,
                service=SERVICE_NAME,
                forceNewDeployment=True
            )
            print(f"ECS deployment triggered for {SERVICE_NAME}")
            
            return {
                'statusCode': 200,
                'body': json.dumps('Deployment triggered successfully!')
            }
        else:
            print(f"Build failed: {build['buildStatus']}")
            return {
                'statusCode': 500,
                'body': json.dumps('Build failed')
            }
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error: {str(e)}')
        }
LAMBDAEOF

# Criar Lambda function (se não existir)
FUNCTION_NAME="${PROJECT_NAME}-deploy-trigger"

# Verificar se Lambda já existe
if ! aws lambda get-function --function-name "$FUNCTION_NAME" &>/dev/null; then
    # Criar ZIP
    cd /tmp
    zip -q lambda-trigger.zip lambda-deployment-trigger.py
    
    # Criar Lambda
    aws lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime python3.12 \
        --role "arn:aws:iam::${ACCOUNT_ID}:role/lambda-execution-role" \
        --handler lambda-deployment-trigger.lambda_handler \
        --zip-file fileb:///tmp/lambda-trigger.zip \
        --timeout 900 \
        --memory-size 1024 \
        --region "$AWS_REGION"
    
    echo "✅ Lambda function criada: $FUNCTION_NAME"
else
    echo "ℹ️ Lambda function já existe: $FUNCTION_NAME"
fi

# 4. Adicionar permissão para EventBridge invocar Lambda
echo ""
echo "4️⃣ Configurando EventBridge como trigger..."

aws lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "EventBridge-trigger" \
    --action "lambda:InvokeFunction" \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${AWS_REGION}:${ACCOUNT_ID}:rule/${PROJECT_NAME}-deploy-prod" \
    --region "$AWS_REGION" 2>/dev/null || echo "ℹ️ Permissão já existe"

# Adicionar target ao EventBridge
aws events put-targets \
    --rule "${PROJECT_NAME}-deploy-prod" \
    --targets '[
        {
            "Id": "LambdaTrigger",
            "Arn": "arn:aws:lambda:'"$AWS_REGION"':'"$ACCOUNT_ID"':function:'"$FUNCTION_NAME"'",
            "RoleArn": "arn:aws:iam::'"$ACCOUNT_ID"':role/eventbridge-lambda-role"
        }
    ]' \
    --region "$AWS_REGION" 2>/dev/null || echo "ℹ️ Target já existe"

# 5. Criar IAM Role para Lambda
echo ""
echo "5️⃣ Criando Lambda execution role..."

LAMBDA_ROLE="${PROJECT_NAME}-lambda-role"

cat > /tmp/lambda-trust.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
}
EOF

if ! aws iam get-role --role-name "$LAMBDA_ROLE" &>/dev/null; then
    aws iam create-role \
        --role-name "$LAMBDA_ROLE" \
        --assume-role-policy-document file:///tmp/lambda-trust.json > /dev/null
    
    aws iam attach-role-policy \
        --role-name "$LAMBDA_ROLE" \
        --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" > /dev/null
    
    aws iam attach-role-policy \
        --role-name "$LAMBDA_ROLE" \
        --policy-arn "arn:aws:iam::aws:policy/AmazonECS_FullAccess" > /dev/null
    
    aws iam attach-role-policy \
        --role-name "$LAMBDA_ROLE" \
        --policy-arn "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser" > /dev/null
    
    echo "✅ Lambda Role criada"
else
    echo "ℹ️ Lambda Role já existe"
fi

# Criar EventBridge role
EVENT_ROLE="${PROJECT_NAME}-eventbridge-role"

if ! aws iam get-role --role-name "$EVENT_ROLE" &>/dev/null; then
    cat > /tmp/eventbridge-trust.json << 'EOF'
    {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "events.amazonaws.com"},
            "Action": "sts:AssumeRole"
        }]
    }
    EOF
    
    aws iam create-role \
        --role-name "$EVENT_ROLE" \
        --assume-role-policy-document file:///tmp/eventbridge-trust.json > /dev/null
    
    # Policy inline para invocar Lambda
    aws iam put-role-policy \
        --role-name "$EVENT_ROLE" \
        --policy-name "InvokeLambda" \
        --policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Action": ["lambda:InvokeFunction"],
                "Resource": "arn:aws:lambda:'"$AWS_REGION"':'"$ACCOUNT_ID"':function:'"$FUNCTION_NAME"'"
            }]
        }' > /dev/null
    
    echo "✅ EventBridge Role criada"
else
    echo "ℹ️ EventBridge Role já existe"
fi

echo ""
echo "================================================"
echo "✅ Auto-Deploy configurado!"
echo ""
echo "📍 URLs:"
echo "   Lambda: https://console.aws.amazon.com/lambda/home?region=$AWS_REGION"
echo "   EventBridge: https://console.aws.amazon.com/events/home?region=$AWS_REGION"
echo "   CodeCommit: https://console.aws.amazon.com/codesuite/codecommit/repositories?region=$AWS_REGION"
echo ""
echo "📝 Para usar:"
echo ""
echo "1. Clone o CodeCommit:"
echo "   git clone https://git-codecommit.${AWS_REGION}.amazonaws.com/v1/repos/${REPO_NAME}"
echo ""
echo "2. Copie seus arquivos para o repositório:"
echo "   cp -r /Users/brunobisogni/Desktop/guardia-app/* ./guardia-app/"
echo "   cd guardia-app && git add . && git commit -m 'Initial commit'"
echo ""
echo "3. Push para main:"
echo "   git push codecommit main"
echo ""
echo "4. O pipeline será disparado automaticamente!"
echo ""
echo "💡 Comandos para configurar remote CodeCommit:"
echo "   git remote add codecommit https://git-codecommit.${AWS_REGION}.amazonaws.com/v1/repos/${REPO_NAME}"
echo "   git push codecommit main"
echo ""
echo "⚠️ IMPORTANTE: Gere credenciais HTTPS para CodeCommit:"
echo "   AWS Console > IAM > Users > seu-user > Security Credentials"
echo "   > HTTPS Git credentials for AWS CodeCommit"
echo "================================================"
