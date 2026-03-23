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

## 数据存储分布

| 数据类型 | 存储位置 | 持久性 | EC2 销毁后 |
|----------|---------|--------|-----------|
| 用户认证（email、密码、token） | AWS Cognito | AWS 托管，自动持久化 | ✅ 不受影响 |
| 上传文件 & 缩略图 | AWS S3 (`heritage-resources-dev`) | AWS 托管，独立于 EC2 | ✅ 不受影响 |
| 业务数据（resources、categories、tags、comments、reviews、用户 profile、状态流转） | MySQL 8.0（EC2 本地磁盘） | 依赖 EC2 实例存活 | ❌ 数据丢失 |
| 前端代码 | GitHub + Amplify 自动构建 | Git 版本控制 | ✅ 不受影响 |
| 后端代码 | GitHub + EC2 `/home/ubuntu/app/` | Git 版本控制，JAR 可重新部署 | ✅ 不受影响 |
| Terraform 状态 | `infra/terraform.tfstate`（本地） | 需手动备份 | ⚠️ 需保留 |

### 风险说明

当前 MySQL 运行在 EC2 本地，这意味着：
- EC2 实例终止（terminate）→ 所有业务数据永久丢失
- EC2 实例停止（stop）再启动 → 数据保留（EBS 卷不会被删除）
- EBS 卷损坏 → 数据丢失

### 数据库备份（手动）

SSH 到 EC2 后执行：
```bash
# 导出完整数据库
mysqldump -u root -p heritage_db > backup_$(date +%Y%m%d).sql

# 上传到 S3 保存
aws s3 cp backup_$(date +%Y%m%d).sql s3://heritage-resources-dev/backups/
```

### 数据库恢复（新 EC2 实例）

```bash
# 从 S3 下载备份
aws s3 cp s3://heritage-resources-dev/backups/backup_YYYYMMDD.sql .

# 导入到新 MySQL
mysql -u root -p heritage_db < backup_YYYYMMDD.sql
```

### 迁移到 AWS RDS（生产环境推荐）

如果需要将数据库从 EC2 本地迁移到 AWS RDS 托管 MySQL：

1. **创建 RDS 实例**（Terraform 或控制台）：
   - Engine: MySQL 8.0
   - Instance: db.t3.micro（最小规格，约 $15/月）
   - 开启自动备份（7 天保留）
   - 多可用区可选（生产建议开启）

2. **导出现有数据**：
   ```bash
   mysqldump -u root -p heritage_db > migration.sql
   ```

3. **导入到 RDS**：
   ```bash
   mysql -h your-rds-endpoint.rds.amazonaws.com -u admin -p heritage_db < migration.sql
   ```

4. **修改后端配置**（`application-prod.yml`）：
   ```yaml
   spring:
     datasource:
       url: jdbc:mysql://your-rds-endpoint.rds.amazonaws.com:3306/heritage_db
       username: admin
       password: ${DB_PASSWORD}
   ```

5. **重启后端服务**，验证数据完整性。

迁移后 EC2 只运行 Spring Boot 应用，数据库由 RDS 独立管理，EC2 可以随时替换而不影响数据。
