# Heritage Resource Platform — 部署说明

## 架构概览

```
用户浏览器
    │
    ▼
AWS Amplify (HTTPS)          ← Next.js 前端 (SSR)
    │  rewrites /api/*
    ▼
EC2 t3.small (HTTP:8080)     ← Spring Boot 后端 + MySQL
    │
    ├── AWS Cognito           ← 用户认证 (JWT)
    ├── AWS S3                ← 文件存储 (pre-signed URLs)
    └── AWS Lambda            ← 缩略图生成
```

## 当前环境

| 组件 | 地址 | 区域 |
|------|------|------|
| 前端 | https://main.d39jebtelw5xqu.amplifyapp.com | us-east-1 |
| 后端 | http://32.193.71.47:8080 (EC2 Elastic IP) | us-east-1 |
| Cognito | us-east-1_9wstms0ZI | us-east-1 |
| S3 | heritage-resources-dev | us-east-1 |

## API 代理 (Rewrites) — 临时方案

当前前端通过 Next.js rewrites 代理 API 请求，解决 HTTPS/HTTP mixed content 问题：

- 浏览器请求 `https://amplify-domain/api/xxx`
- Amplify (Next.js SSR) 服务端代理到 `http://EC2:8080/api/xxx`
- 浏览器只看到 HTTPS，无 mixed content

配置位于 `frontend/next.config.ts`，Amplify 环境变量：
- `NEXT_PUBLIC_API_URL` = ""（空，让前端调自己的 /api/*）
- `BACKEND_URL` = "http://32.193.71.47:8080"

### 切换到正式 HTTPS 后端

当 CloudFront 验证通过或购买域名后：

1. 删除 `next.config.ts` 中的 `rewrites` 配置
2. 将 `NEXT_PUBLIC_API_URL` 设为后端 HTTPS 地址（如 `https://api.yourdomain.com`）
3. 删除 `BACKEND_URL` 环境变量
4. 重新部署 Amplify

## 基础设施 (Terraform)

所有 AWS 资源通过 Terraform 管理，配置在 `infra/` 目录：

```powershell
cd infra
terraform init
terraform apply `
  -var="environment=dev" `
  -var="ssh_public_key=$(Get-Content ~/.ssh/heritage-key.pub)" `
  -var="db_password=YourPassword" `
  -var="frontend_origin=https://your-amplify-domain.amplifyapp.com"
```

创建的资源：EC2 + EIP、Security Group、IAM Role、Cognito User Pool、S3 Bucket、Lambda、CloudFront（待验证）。

## EC2 后端管理

SSH 连接：
```bash
ssh -i ~/.ssh/heritage-key ubuntu@32.193.71.47
```

服务管理：
```bash
sudo systemctl status heritage-backend
sudo systemctl restart heritage-backend
sudo journalctl -u heritage-backend -f    # 查看日志
```

更新部署：
```bash
cd ~/heritage-resource-platform && git pull origin main
cd backend && mvn clean package -DskipTests -q
cp target/heritage-platform-0.0.1-SNAPSHOT.jar ~/app/
sudo systemctl restart heritage-backend
```
