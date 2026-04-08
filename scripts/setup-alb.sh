#!/bin/bash
# =============================================================
# Guardiã — Setup do Application Load Balancer (URL fixa)
# Executar UMA VEZ para criar a infraestrutura do ALB.
# =============================================================

set -e

AWS_REGION="us-east-1"
VPC_ID="vpc-008dd58344144e978"
SUBNETS="subnet-05ce334c00ff95efd subnet-0a2a69670b40359f7 subnet-0394953375b038f8f"
TASK_SG="sg-04bf05cdace1fdff2"
CLUSTER="guardia-cluster"
SERVICE="guardia-service"
ALB_NAME="guardia-alb"
TG_NAME="guardia-tg"

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)

echo "=============================================="
echo " 🔧 Setup Application Load Balancer — Guardiã"
echo "=============================================="

# ── 1. Security Group para o ALB (porta 80 pública) ──
echo ""
echo "1. Criando Security Group do ALB..."

ALB_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=guardia-alb-sg" "Name=vpc-id,Values=${VPC_ID}" \
  --region "${AWS_REGION}" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null)

if [[ -z "$ALB_SG_ID" || "$ALB_SG_ID" == "None" ]]; then
  ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name "guardia-alb-sg" \
    --description "ALB Guardia - porta 80 publica" \
    --vpc-id "${VPC_ID}" \
    --region "${AWS_REGION}" \
    --query 'GroupId' \
    --output text)
  echo "  ✅ SG criado: ${ALB_SG_ID}"

  # Libera porta 80 de qualquer origem
  aws ec2 authorize-security-group-ingress \
    --group-id "${ALB_SG_ID}" \
    --protocol tcp --port 80 \
    --cidr 0.0.0.0/0 \
    --region "${AWS_REGION}" > /dev/null

  echo "  ✅ Regra 0.0.0.0/0:80 adicionada"
else
  echo "  ℹ️  SG já existe: ${ALB_SG_ID}"
fi

# ── 2. Permite que o SG das tasks receba do ALB na porta 3000 ──
echo ""
echo "2. Atualizando regra do SG das tasks (ALB → 3000)..."

ALREADY=$(aws ec2 describe-security-groups \
  --group-ids "${TASK_SG}" \
  --region "${AWS_REGION}" \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`3000\` && UserIdGroupPairs[?GroupId=='${ALB_SG_ID}']].FromPort" \
  --output text 2>/dev/null)

if [[ -z "$ALREADY" ]]; then
  aws ec2 authorize-security-group-ingress \
    --group-id "${TASK_SG}" \
    --protocol tcp --port 3000 \
    --source-group "${ALB_SG_ID}" \
    --region "${AWS_REGION}" > /dev/null 2>&1 || true
  echo "  ✅ Regra ALB→tasks:3000 adicionada"
else
  echo "  ℹ️  Regra ALB→tasks:3000 já existe"
fi

# ── 3. Target Group ──────────────────────────────────
echo ""
echo "3. Criando Target Group..."

TG_ARN=$(aws elbv2 describe-target-groups \
  --names "${TG_NAME}" \
  --region "${AWS_REGION}" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || echo "")

if [[ -z "$TG_ARN" || "$TG_ARN" == "None" ]]; then
  TG_ARN=$(aws elbv2 create-target-group \
    --name "${TG_NAME}" \
    --protocol HTTP \
    --port 3000 \
    --vpc-id "${VPC_ID}" \
    --target-type ip \
    --health-check-path "/" \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 10 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region "${AWS_REGION}" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
  echo "  ✅ Target Group: ${TG_ARN}"
else
  echo "  ℹ️  Target Group já existe: ${TG_ARN}"
fi

# ── 4. Application Load Balancer ─────────────────────
echo ""
echo "4. Criando Application Load Balancer..."

ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names "${ALB_NAME}" \
  --region "${AWS_REGION}" \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || echo "")

if [[ -z "$ALB_ARN" || "$ALB_ARN" == "None" ]]; then
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name "${ALB_NAME}" \
    --subnets ${SUBNETS} \
    --security-groups "${ALB_SG_ID}" \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --region "${AWS_REGION}" \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)
  echo "  ✅ ALB criado: ${ALB_ARN}"
else
  echo "  ℹ️  ALB já existe: ${ALB_ARN}"
fi

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "${ALB_ARN}" \
  --region "${AWS_REGION}" \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# ── 5. Listener HTTP:80 ──────────────────────────────
echo ""
echo "5. Criando Listener HTTP:80..."

LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn "${ALB_ARN}" \
  --region "${AWS_REGION}" \
  --query 'Listeners[?Port==`80`].ListenerArn' \
  --output text 2>/dev/null)

if [[ -z "$LISTENER_ARN" || "$LISTENER_ARN" == "None" ]]; then
  aws elbv2 create-listener \
    --load-balancer-arn "${ALB_ARN}" \
    --protocol HTTP \
    --port 80 \
    --default-actions "Type=forward,TargetGroupArn=${TG_ARN}" \
    --region "${AWS_REGION}" \
    --output text > /dev/null
  echo "  ✅ Listener criado (HTTP:80 → ${TG_NAME})"
else
  echo "  ℹ️  Listener já existe"
fi

# ── 6. Associar ALB ao ECS Service ──────────────────
echo ""
echo "6. Associando ALB ao serviço ECS..."

# Obtém a task definition mais recente
TASK_DEF=$(aws ecs describe-services \
  --cluster "${CLUSTER}" \
  --services "${SERVICE}" \
  --region "${AWS_REGION}" \
  --query 'services[0].taskDefinition' \
  --output text)

# Verifica se já tem LB associado
HAS_LB=$(aws ecs describe-services \
  --cluster "${CLUSTER}" \
  --services "${SERVICE}" \
  --region "${AWS_REGION}" \
  --query 'length(services[0].loadBalancers)' \
  --output text)

if [[ "$HAS_LB" == "0" ]]; then
  echo "  Recriando serviço com ALB..."

  # Captura a configuração de rede atual
  NETWORK_CONFIG=$(aws ecs describe-services \
    --cluster "${CLUSTER}" \
    --services "${SERVICE}" \
    --region "${AWS_REGION}" \
    --query 'services[0].networkConfiguration' \
    --output json)

  # Deleta o serviço atual (zera tasks primeiro)
  aws ecs update-service \
    --cluster "${CLUSTER}" \
    --service "${SERVICE}" \
    --desired-count 0 \
    --region "${AWS_REGION}" > /dev/null

  aws ecs wait services-stable \
    --cluster "${CLUSTER}" \
    --services "${SERVICE}" \
    --region "${AWS_REGION}"

  aws ecs delete-service \
    --cluster "${CLUSTER}" \
    --service "${SERVICE}" \
    --region "${AWS_REGION}" > /dev/null

  # Aguarda deleção
  sleep 15

  # Cria com ALB
  aws ecs create-service \
    --cluster "${CLUSTER}" \
    --service-name "${SERVICE}" \
    --task-definition "${TASK_DEF}" \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "${NETWORK_CONFIG}" \
    --load-balancers "[{\"targetGroupArn\":\"${TG_ARN}\",\"containerName\":\"guardia-app\",\"containerPort\":3000}]" \
    --health-check-grace-period-seconds 60 \
    --region "${AWS_REGION}" \
    --output text > /dev/null

  echo "  ✅ Serviço recriado com ALB"
else
  echo "  ℹ️  Serviço já tem ALB associado"
fi

# ── 7. Aguarda ALB ficar ativo ───────────────────────
echo ""
echo "7. Aguardando ALB ficar ACTIVE (pode demorar ~2 min)..."
aws elbv2 wait load-balancer-available \
  --load-balancer-arns "${ALB_ARN}" \
  --region "${AWS_REGION}"

# ── Resultado ────────────────────────────────────────
echo ""
echo "=============================================="
echo " ✅ ALB configurado com sucesso!"
echo "=============================================="
echo ""
echo " 🌐 URL FIXA: http://${ALB_DNS}"
echo ""
echo " Salve esta URL — ela nunca muda, mesmo com redeploys."
echo ""
echo " ALB ARN    : ${ALB_ARN}"
echo " Target Group: ${TG_ARN}"
echo " Logs       : aws logs tail /ecs/guardia-app --follow"
echo "=============================================="

# Salva a URL para uso no deploy.sh
echo "ALB_DNS=${ALB_DNS}" > .alb-config
echo "TG_ARN=${TG_ARN}" >> .alb-config
echo "ALB_ARN=${ALB_ARN}" >> .alb-config
echo ""
echo " ℹ️  Config salva em .alb-config para uso nos deploys"
