# 阿里云迁移计划

## 目标架构

所有服务部署在一台阿里云 ECS（ecs.c9i.large, 8 vCPU / 16GB RAM）上：

```
┌─────────────────────────────────────────────────────────┐
│                 阿里云 ECS (ecs.c9i.large)               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Nginx (port 80/443)                            │    │
│  │  - 反向代理 → Spring Boot :8080                  │    │
│  │  - 静态文件托管 → Next.js build output            │    │
│  │  - HTTPS (自签证书 or Let's Encrypt if 有域名)    │    │
│  └──────────┬──────────────────┬───────────────────┘    │
│             │                  │                         │
│  ┌──────────▼──────────┐  ┌───▼───────────────────┐    │
│  │  Spring Boot :8080   │  │  Next.js static files │    │
│  │  - REST API          │  │  (nginx 直接托管)      │    │
│  │  - 本地 JWT 认证      │  │                       │    │
│  │  - 本地文件存储       │  └───────────────────────┘    │
│  │  - 缩略图生成(本地)   │                               │
│  └──────────┬───────────┘                               │
│             │                                           │
│  ┌──────────▼──────────┐                                │
│  │  MySQL 8.0           │                                │
│  │  - heritage_db       │                                │
│  └─────────────────────┘                                │
│                                                         │
│  /opt/heritage/uploads/      ← 用户上传文件              │
│  /opt/heritage/thumbnails/   ← 生成的缩略图              │
└─────────────────────────────────────────────────────────┘
```

## AWS → 阿里云 服务替换对照

| AWS 服务 | 当前用途 | 阿里云方案 | 改动量 |
|---------|---------|-----------|-------|
| EC2 | Spring Boot + MySQL | ECS (ecs.c9i.large) | 仅部署脚本 |
| Cognito | 用户认证 (JWT) | 自建认证 (bcrypt + 本地 JWT 签发) | 大 |
| S3 | 文件存储 (pre-signed URLs) | ECS 本地磁盘 + Nginx 静态托管 | 中 |
| Lambda | 缩略图生成 | Spring Boot 内置异步处理 | 中 |
| Amplify | 前端 SSR 托管 | Next.js export → Nginx 静态托管 | 小 |
| CloudFront | HTTPS 代理 | Nginx (同一台 ECS) | 小 |
| Terraform | 基础设施管理 | 不需要 (单台 ECS 手动配置) | 删除 |

## 迁移步骤（按顺序）

### Phase 1: 认证系统改造（最大改动）✅ 已完成

去掉 AWS Cognito，改为自建认证：

**后端改动：**
1. ✅ `pom.xml` — 去掉 AWS Cognito SDK，加 `jjwt-api/impl/jackson` (0.12.6)
2. ✅ `User` 实体 — 加 `passwordHash` 字段，`cognitoSub` 改为 nullable
3. ✅ 新建 `JwtService` — HMAC-SHA256 签发/验证 JWT（email 为 subject，含 userId + role claims）
4. ✅ 重写 `AuthService` — bcrypt 加密密码，本地 JWT 签发，去掉所有 Cognito 调用
5. ✅ 重写 `SecurityConfig` — 统一配置（去掉 Profile 区分），JwtAuthFilter 替代 OAuth2 Resource Server
6. ✅ 所有 Service 中 `findByCognitoSub()` → `findByEmail()`（ResourceService, AdminService, ReviewService, CommentService, FileService, UserService）
7. ✅ Flyway V2 migration — `password_hash` 列，`cognito_sub` 改 nullable
8. ✅ 删除 `AwsCognitoConfig`, `AwsClientConfig`, `LocalSecurityConfig`, `LocalAuthFilter`
9. ✅ `AuthResponse` 简化为 `accessToken` + `expiresIn`
10. ✅ 9 个测试文件全部同步更新

**前端改动：**
11. ✅ `auth-context.tsx` — token 存储简化（只存 accessToken）
12. ✅ `types/index.ts` — AuthResponse 类型简化

### Phase 2: 文件存储改造 ✅ 已完成

去掉 AWS S3，改为本地磁盘存储：

**后端改动：**
1. 新建 `LocalFileService`（替代现有 `FileService`）
   - 上传：直接接收 multipart file，存到 `/opt/heritage/uploads/`
   - 下载：返回文件 URL（Nginx 静态托管）
   - 删除：直接删本地文件
2. 去掉 `AwsS3Config`、S3 相关代码
3. `FileController` — 改为接收 multipart upload（不再用 pre-signed URL）
4. `ResourceResponse` — `thumbnailUrl` 改为本地路径

**前端改动：**
5. `file-uploader.tsx` — 改为标准 multipart form upload（不再用 pre-signed URL 直传 S3）

### Phase 3: 缩略图生成 ✅ 已完成（合并到 Phase 2）

去掉 AWS Lambda，改为 Spring Boot 内置处理：

1. 加 `thumbnailator` 依赖（Java 缩略图库）
2. 在文件上传后同步或异步生成缩略图，存到 `/opt/heritage/thumbnails/`
3. 去掉 `InternalController`（Lambda callback 端点）
4. 去掉 `ApiKeyAuthFilter`（Lambda 认证用的）

### Phase 4: 前端部署 ✅ 已完成

Next.js 改为静态导出，Nginx 托管：

1. `next.config.ts` — 加 `output: 'export'`（静态导出）
2. 去掉 `rewrites` 配置（Nginx 处理代理）
3. `npm run build` 生成 `out/` 目录
4. Nginx 配置：静态文件 → `out/`，`/api/*` → proxy_pass localhost:8080

### Phase 5: 服务器配置 ✅ 已完成

ECS 上安装和配置：

```bash
# 1. 安装依赖
sudo apt update
sudo apt install -y openjdk-21-jdk mysql-server nginx nodejs npm

# 2. 配置 MySQL
sudo mysql -e "CREATE DATABASE heritage_db CHARACTER SET utf8mb4;"
sudo mysql -e "CREATE USER 'heritage'@'localhost' IDENTIFIED BY 'password';"
sudo mysql -e "GRANT ALL ON heritage_db.* TO 'heritage'@'localhost';"

# 3. 创建文件存储目录
sudo mkdir -p /opt/heritage/uploads /opt/heritage/thumbnails
sudo chown -R ubuntu:ubuntu /opt/heritage

# 4. 部署后端
cd backend && mvn clean package -DskipTests
cp target/heritage-platform-0.0.1-SNAPSHOT.jar /opt/heritage/

# 5. 构建前端
cd frontend && npm install && npm run build
sudo cp -r out/* /var/www/heritage/

# 6. 配置 Nginx（见下方配置）
# 7. 配置 systemd service（同 AWS 版本）
```

**Nginx 配置：**
```nginx
server {
    listen 80;
    server_name _;

    # 前端静态文件
    root /var/www/heritage;
    index index.html;

    # API 代理
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Swagger UI
    location /swagger-ui/ {
        proxy_pass http://localhost:8080;
    }
    location /v3/api-docs {
        proxy_pass http://localhost:8080;
    }

    # 上传文件静态托管
    location /files/uploads/ {
        alias /opt/heritage/uploads/;
    }
    location /files/thumbnails/ {
        alias /opt/heritage/thumbnails/;
    }

    # Next.js SPA fallback
    location / {
        try_files $uri $uri.html $uri/ /index.html;
    }
}
```

### Phase 6: CI/CD 调整 ✅ 已完成

GitHub Actions 改为部署到阿里云 ECS：
- 改 SSH host/key 为阿里云 ECS 的
- 前端 build 也加入 pipeline（不再依赖 Amplify）

## 可删除的文件/代码

| 文件/目录 | 原因 |
|----------|------|
| `infra/` (整个目录) | Terraform AWS 资源，不再需要 |
| `lambda/` (整个目录) | Lambda 缩略图函数 |
| `AwsS3Config.java` | S3 客户端配置 |
| `AwsCognitoConfig.java` | Cognito 客户端配置 |
| `AwsClientConfig.java` | AWS SDK 通用配置 |
| `ApiKeyAuthFilter.java` | Lambda 内部 API 认证 |
| `InternalController.java` | Lambda callback 端点 |
| `pom.xml` 中 AWS SDK 依赖 | 不再需要 |

## 预估工时

| Phase | 内容 | 预估时间 |
|-------|------|---------|
| Phase 1 | 认证系统改造 | 3-4 小时 |
| Phase 2 | 文件存储改造 | 2-3 小时 |
| Phase 3 | 缩略图生成 | 1 小时 |
| Phase 4 | 前端部署改造 | 1 小时 |
| Phase 5 | 服务器配置 | 1-2 小时 |
| Phase 6 | CI/CD 调整 | 30 分钟 |
| 总计 | | 约 1-2 天 |

## 注意事项

- 数据迁移：需要从 AWS MySQL 导出数据，导入阿里云 MySQL
- 用户密码：Cognito 的密码无法导出，迁移后用户需要重新注册（或提供"重置密码"功能）
- 文件迁移：S3 上的文件需要下载后上传到 ECS 本地磁盘
- Next.js static export 不支持 SSR 和 API routes，所有动态内容走后端 API
