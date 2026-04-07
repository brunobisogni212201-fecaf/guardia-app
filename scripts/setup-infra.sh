#!/bin/bash

set -e

echo "=== Setup Infraestrutura AWS para Guardiã App ==="

AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
VPC_CIDR="10.0.0.0/16"
CLUSTER_NAME="guardia-cluster"

echo "Account ID: ${AWS_ACCOUNT_ID}"
echo "Region: ${AWS_REGION}"

# 1. Criar VPC
echo "=== 1. Criando VPC ==="
VPC_ID=$(aws ec2 create-vpc --cidr-block ${VPC_CIDR} --query 'Vpc.VpcId' --output text)
aws ec2 create-tags --resources ${VPC_ID} --tags Key=Name,Value=guardia-vpc
echo "VPC: ${VPC_ID}"

# 2. Criar Subnets públicas
echo "=== 2. Criando Subnets ==="
SUBNET_A=$(aws ec2 create-subnet --vpc-id ${VPC_ID} --cidr-block 10.0.1.0/24 --availability-zone ${AWS_REGION}a --query 'Subnet.SubnetId' --output text)
SUBNET_B=$(aws ec2 create-subnet --vpc-id ${VPC_ID} --cidr-block 10.0.2.0/24 --availability-zone ${AWS_REGION}b --query 'Subnet.SubnetId' --output text)
aws ec2 create-tags --resources ${SUBNET_A} ${SUBNET_B} --tags Key=Name,Value=guardia-subnet
echo "Subnet A: ${SUBNET_A}"
echo "Subnet B: ${SUBNET_B}"

# 3. Criar Internet Gateway
echo "=== 3. Criando Internet Gateway ==="
IGW_ID=$(aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --vpc-id ${VPC_ID} --internet-gateway-id ${IGW_ID}
echo "IGW: ${IGW_ID}"

# 4. Criar Route Table
echo "=== 4. Criando Route Table ==="
RT_ID=$(aws ec2 create-route-table --vpc-id ${VPC_ID} --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id ${RT_ID} --destination-cidr-block 0.0.0.0/0 --gateway-id ${IGW_ID}
aws ec2 associate-route-table --route-table-id ${RT_ID} --subnet-id ${SUBNET_A}
aws ec2 associate-route-table --route-table-id ${RT_ID} --subnet-id ${SUBNET_B}
echo "Route Table: ${RT_ID}"

# 5. Criar Security Group
echo "=== 5. Criando Security Group ==="
SG_ID=$(aws ec2 create-security-group --group-name guardia-sg --description "Security group for Guardiã App" --vpc-id ${VPC_ID} --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id ${SG_ID} --protocol tcp --port 3000 --cidr 0.0.0.0/0
echo "Security Group: ${SG_ID}"

# 6. Criar ECS Cluster
echo "=== 6. Criando ECS Cluster ==="
aws ecs create-cluster --cluster-name ${CLUSTER_NAME} --capacity-providers FARGATE --settings "name=containerInsights,value=enabled"
echo "Cluster: ${CLUSTER_NAME}"

# 7. Criar ECR Repository
echo "=== 7. Criando ECR Repository ==="
aws ecr create-repository --repository-name guardia-app --region ${AWS_REGION} 2>/dev/null || echo "Repositório ECR já existe"

# 8. Criar IAM Roles
echo "=== 8. Criando IAM Roles ==="

# ECS Task Execution Role
aws iam create-role --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}' 2>/dev/null

aws iam attach-role-policy --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy 2>/dev/null || echo "Policy já attachada"

# App Task Role
aws iam create-role --role-name guardia-app-task-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}' 2>/dev/null

# Attach S3 permissions
aws iam put-role-policy --role-name guardia-app-task-role --policy-name s3-access \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:PutObject","s3:GetObject"],"Resource":"arn:aws:s3:::guardia-analysis-archive/*"}]}' 2>/dev/null || echo "S3 policy já existe"

# 9. Criar Log Group
echo "=== 9. Criando CloudWatch Log Group ==="
aws logs create-log-group --log-group-name /ecs/guardia-app 2>/dev/null || echo "Log group já existe"

echo ""
echo "=== Setup Concluído! ==="
echo ""
echo "Resumo:"
echo "  VPC: ${VPC_ID}"
echo "  Subnets: ${SUBNET_A}, ${SUBNET_B}"
echo "  Security Group: ${SG_ID}"
echo "  Cluster: ${CLUSTER_NAME}"
echo ""
echo "Próximo passo: Executar deploy-ecr.sh"